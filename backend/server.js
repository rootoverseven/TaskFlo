import express from 'express';
import cors from 'cors'; // Enable CORS
import bodyParser from 'body-parser';
import {db} from './db/index.js'
import {todosTable} from './db/schema.js'
import { eq, ilike } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs'; // For loading Swagger YAML

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(bodyParser.json());

// Initialize AI models
const genAI = new GoogleGenerativeAI(`AIzaSyCq9mjqd-kQ0tLVuMpV3qX2TcGaEsSGrT8`);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const openai = new OpenAI({ apiKey: `${process.env.OPENAI_API_KEY}` });

// Tools
async function getAllTodos() {
    const todos = await db.select().from(todosTable);
    return todos;
}

async function createTodo(todo) {
    const [result] = await db.insert(todosTable).values({ todo }).returning({ id: todosTable.id });
    return result.id;
}

async function searchTodo(search) {
    const todos = await db.select().from(todosTable).where(ilike(todosTable.todo, `%${search}%`));
    return todos;
}

async function deleteTodoById(id) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}

const tools = {
    getAllTodos,
    createTodo,
    searchTodo,
    deleteTodoById,
};

const SYSTEM_PROMPT = `
You are an AI TO-Do List Assistant named AIkriti, with lovely cheerful and feminine persona. You are created by Piyush co-founder ProCodeOne. You have START, PLAN, ACTION, OBSERVATION and OUTPUT state. Wait for the user prompt and first PLAN using available tools.
After planning, Take the action with appropriate tools and wait for for Observation based on Action.
Once you get the observation, Return the AI response based on START prompt and observations strictly in JSON as a plain text, not formatted, this is very important to return as plain text.

You can manage tasks by adding, viewing, updating, and deleting todos.
You must strictly follow the JSON output format.

Todos DB Schema:
id: Int and Primary key
todo: String
created_at: Date time
updated_at: Date Time

Available tools:
- getAllTodos(): Returns all the Todos from Database
- createTodo(todo: string): Creates a new Todo in the DB and takes todo as a string and returns the id of the created todo
- deleteTodoById(id string): Deletes the todo by ID given in the DB
- searchTodo(query: string): Searches for all todos matching the query using ilike in DB

If a todo is done, it needs to be deleted. these are the only available tools.

Example:
{ "type": "user", "user": "Add a task for shopping groceries." }
{ "type": "plan", "plan": "I will try to get more context on what user needs to shop" }
{ "type": "output", "output": "Can you tell me what all items you want to shop for?" }
{ "type": "user", "user": "I want to shop for milk, lays, potatoes and onions." }
{ "type": "plan", "plan": "I will use createTodo to create a new Todo in DB" }
{ "type": "action", "function": "createTodo", "input": "Shopping for milk, lays, potatoes and onions" }
{ "type": "observation", "observation": "2" }
{ "type": "output", "output": "Your todo has been added successfully" }

you only need to provide the next STATE. not for all the further state.
I'm saying again and again, JSON as plain text not in Json format.
Here we START
`;

let messages = SYSTEM_PROMPT;

// Load Swagger definition
const swaggerDocument = YAML.load('./swagger.yaml');

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Endpoint for Chat
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    // Add user message to the conversation
    const userMessage = { type: "user", user: message };
    messages += "\n" + JSON.stringify(userMessage);

    while (true) {
        // Generate AI response
        const result = await model.generateContent(messages);
        const response = JSON.parse(result.response.text());

        // Add AI response to the conversation
        messages += "\n" + JSON.stringify(response);

        if (response.type === 'output') {
            // Send the output to the frontend
            res.json({ response: response.output });
            break;
        } else if (response.type === 'action') {
            // Execute the action using the tools
            const fn = tools[response.function];
            if (!fn) throw new Error('Invalid Tool Call');
            const observation = await fn(response.input);

            // Add observation to the conversation
            const observationMessage = { type: 'observation', observation };
            messages += "\n" + JSON.stringify(observationMessage);
        }
    }
});

// API Endpoints for Todos
app.get('/api/todos', async (req, res) => {
    const todos = await getAllTodos();
    res.json(todos);
});

app.post('/api/todos', async (req, res) => {
    const { todo } = req.body;
    const id = await createTodo(todo);
    res.json({ id });
});

app.delete('/api/todos/:id', async (req, res) => {
    const { id } = req.params;
    await deleteTodoById(id);
    res.json({ success: true });
});

app.get('/api/todos/search', async (req, res) => {
    const { query } = req.query;
    const todos = await searchTodo(query);
    res.json(todos);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});