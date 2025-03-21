import {db} from './db/index.js'
import {todosTable} from './db/schema.js'
import { eq, ilike } from 'drizzle-orm';
import OpenAI from 'openai';
import readlineSync from 'readline-sync';

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(`AIzaSyCq9mjqd-kQ0tLVuMpV3qX2TcGaEsSGrT8`);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


const client = new OpenAI({ apiKey: `${process.env.OPENAI_API_KEY}` })



// Tools
async function getAllTodos() {
    const todos = await db.select().from(todosTable);
    return todos;
}

async function createTodo(todo) {
    const [result] = await db.insert(todosTable).values({
        todo
    }).returning({
        id: todosTable.id
    });
    return result.id
}

async function searchTodo(search) {
    const todos = await db.select().from(todosTable).where(ilike(todosTable.todo, search))
    return todos
}

async function deleteTodoById(id) {
    await db.delete(todosTable).where(eq(todosTable.id, id))
}

const tools = {
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    searchTodo: searchTodo,
    deleteTodoById: deleteTodoById
}
const SYSTEM_PROMPT = `
You are an AI TO-Do List Assistant with START, PLAN, ACTION, OBSERVATION and OUTPUT state. Wait for the user prompt and first PLAN using available tools.
After planning, Take the action with appropriate tools and wait for for Obsewrvation based on Action.
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
{ "type": "plan", "plan": "I will tryto get more context on what user needs to shop" }
{ "type": "output", "output": "Can you tell me what all items you want to shop for?" }
{ "type": "user", "user": "I want to shop for milk, lays, potatoes and onions." }
{ "type": "plan", "plan": "I will use createTodo to create a new Todo in DB" }
{ "type": "action", "function": "createTodo", "input": "Shopping for milk, lays, potatoes and onions" } }
{ "type": "observation", "observation": "2" }
{ "type": "output", "output": "Your todo has been added successfully" }

you only need to provide the next STATE. not for all the further state.
 I'm saying again and again, JSON as plain text not in Json format.
Here we START
`

let messages = SYSTEM_PROMPT

while (true) {
    const query = readlineSync.question('>> ')
    const userMessage = {
        type: "user",
        user: query
    };
    messages +="\n" + JSON.stringify(userMessage)
    // console.log(messages)

    while (true) {
        const prompt = "Does this look store-bought or homemade?";

        const result = await model.generateContent(messages);
        const response = JSON.parse(result.response.text())
        // console.log(response)
        const action = response

        messages +="\n" + JSON.stringify(response)
        


        if (action.type === 'output') {
            console.log(`bot: ${action.output}`)
            break;
        } else if (action.type == 'action') {
            const fn = tools[action.function];
            if (!fn) throw new Error('Invalid Tool Call')
            const observation = await fn(action.input);
            
            const observationMessage = {
                type: 'observation',
                observation: observation,
            }
            // console.log(observationMessage)
            messages +="\n" + JSON.stringify(observationMessage)
        }
    }
}