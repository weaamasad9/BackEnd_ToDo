import express from 'express'
import prisma from '../prismaClient.js'
import { GoogleGenAI } from '@google/genai'; // AI SDK
import nodemailer from 'nodemailer'

const router = express.Router()
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 
// Get all todos for logged-in user
router.get('/', async (req, res) => {
    const todos = await prisma.todo.findMany({
        where: {
            userId: req.userId
        }
    })

    res.json(todos)
})

// Create a new todo
router.post('/', async (req, res) => {
    const { task } = req.body

    const todo = await prisma.todo.create({
        data: {
            task,
            userId: req.userId
        }
    })

    res.json(todo)
})

// Update a todo
router.put('/:id', async (req, res) => {
    const { completed } = req.body
    const { id } = req.params

    const updatedTodo = await prisma.todo.update({
        where: {
            id: parseInt(id),
            userId: req.userId
        },
        data: {
            completed: !!completed
        }
    })
    res.json(updatedTodo)
})

// Delete a todo
router.delete('/:id', async (req, res) => {
    const { id } = req.params
    const userId = req.userId
    await prisma.todo.delete({
        where: {
            id: parseInt(id),
            userId
        }
    })

    res.send({ message: "Todo deleted" })
})
/**
 * POST /todos/prioritize
 * @description: Endpoint to send open tasks to the Gemini AI model for priority assignment.
 * The model returns JSON which is used to update the database.
 * @middleware: authMiddleware (already applied in server.js)
 */// File: todoRoutes.js (Replace the entire /prioritize route)

/**
 * Helper function to safely parse and clean the AI's response text.
 * It removes potential markdown wrappers (```json...```) and ensures it's an array.
 */
function safeParseAiResponse(text) {
    // 1. Remove JSON markdown wrappers if the AI included them
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7, cleanedText.lastIndexOf('```')).trim();
    }
    
    // 2. Parse the text into a JavaScript object
    const result = JSON.parse(cleanedText);

    // 3. Ensure the result is an array before returning
    if (!Array.isArray(result)) {
        console.error("AI returned non-array structure:", result);
        return [];
    }

    return result;
}

router.post('/prioritize', async (req, res) => {
    try {
        const userId = req.userId;

        const todos = await prisma.todo.findMany({ 
            where: { userId, completed: false },
            select: { id: true, task: true } 
        });

        if (todos.length === 0) {
            return res.status(200).json({ message: 'No tasks to prioritize' });
        }

        const taskList = todos.map(t => `ID ${t.id}: ${t.task}`).join('\n');

        const prompt = `Based on the following list of tasks, categorize each task into one of these priority levels: "High", "Medium", or "Low". 
                        Return the response as a VALID JSON array. Each object MUST have an "id" (integer) and a "priority" (string) field. 
                        Do not include any other text, explanation, or markdown formatting outside the JSON array.
                        
                        Tasks:
                        ---
                        ${taskList}
                        ---
                        `;
        
        // 1. AI Call
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                // schema helps enforce JSON, but we still need cleanup
                responseSchema: { 
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "integer" },
                            priority: { type: "string", enum: ["High", "Medium", "Low"] }
                        },
                        required: ["id", "priority"]
                    }
                }
            }
        });

        // 2. Safely parse and clean the AI's response
        const priorities = safeParseAiResponse(response.text);

        // 3. 💡 The Critical Fix: Filter out any elements that are not valid objects with an 'id'
        const validPriorities = priorities.filter(p => p && typeof p === 'object' && Number.isInteger(p.id));

        if (validPriorities.length === 0) {
            console.warn('AI returned tasks but produced no valid priorities to update.');
            return res.status(200).json({ message: 'AI processing completed, but no updates were made.' });
        }


        // 4. Update DB
        const updates = validPriorities.map(p => prisma.todo.update({
            // Ensure ID is an integer for Prisma comparison
            where: { id: parseInt(p.id), userId: userId }, 
            data: { priority: p.priority }
        }));

        await prisma.$transaction(updates);
        
        res.json({ message: 'Tasks prioritized successfully' });

    } catch (error) {
        // Output the full error to your server console for debugging
        console.error('FULL AI/DB Error Details:', error); 
        res.status(500).json({ error: 'Failed to prioritize tasks or connect to AI service.' });
    }
});

router.post('/email-tasks', async (req, res) => {
    const userId = req.userId;
    const { targetEmail } = req.body; 

    if (!targetEmail) {
        return res.status(400).json({ error: 'Target email is required.' });
    }

    try {
        // 1. Fetch all tasks for the user
        const todos = await prisma.todo.findMany({
            where: { userId },
            orderBy: [{ completed: 'asc' }, { priority: 'desc' }]
        });

       
        let htmlContent = `
            <h2>Your Updated Task List:</h2>
            <table border="1" style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 10px;">Task</th>
                        <th style="padding: 10px;">Priority</th>
                        <th style="padding: 10px;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        
        todos.forEach(todo => {
            const status = todo.completed ? '✅ Completed' : '⏳ Open';
            const priorityColor = todo.priority === 'High' ? '#ef4444' : todo.priority === 'Medium' ? '#f59e0b' : '#3b82f6';
            
            htmlContent += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${todo.task}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; color: ${priorityColor}; font-weight: bold;">${todo.priority || 'Medium'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${status}</td>
                </tr>
            `;
        });

        htmlContent += `
                </tbody>
            </table>
            <p style="margin-top: 20px;">Good luck with your tasks!</p>
        `;

        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false 
            }
        });

        // 4. Send the Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: targetEmail, 
            subject: 'Updated Task List - Todo App',
            html: htmlContent, 
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`Email sent to: ${targetEmail}`);
        res.json({ message: 'Your task list has been successfully sent!' });

    } catch (error) {
        console.error('Email sending failed:', error);
        res.status(500).json({ error: 'Email sending failed. Please ensure your Gmail App Password is configured correctly.' });
    }
});

export default router