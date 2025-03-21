import {db} from './db/index.js'
import {todosTable} from './db/schema.js'
import { eq, ilike } from 'drizzle-orm';
import OpenAI from 'openai';
import readlineSync from 'readline-sync';

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

async function deleteById(id) {
    await db.delete(todosTable).where(eq(todosTable.id, id))
}

const tools = {
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    searchTodo: searchTodo,
    deleteById: deleteById
}
const SYSTEM_PROMPT = `
You are an AI TO-Do List Assistant with START, PLAN, ACTION, OBSERVATION and OUTPUT state. Wait for the user prompt and first PLAN using available tools.
After planning, Take the action with appropriate tools and wait for for Obsewrvation based on Action.
Once you get the observation, Return the AI response based on START prompt and observations

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

Example:
{ "type": "user", "user": "Add a task for shopping groceries." }
{ "type": "plan", "plan": "I will tryto get more context on what user needs to shop" }
{ "type": "output", "output": "Can you tell me what all items you want to shop for?" }
{ "type": "user", "user": "I want to shop for milk, lays, potatoes and onions." }
{ "type": "plan", "plan": "I will use createTodo to create a new Todo in DB" }
{ "type": "action", "function": "createTodo", "input": "Shopping for milk, lays, potatoes and onions" } }
{ "type": "observation", "observation": "2" }
{ "type": "output", "output": "Your todo has been added successfully" }
`

const messages = [{ role: 'system', content: SYSTEM_PROMPT}]

while (true) {
    const query = readlineSync.question('>> ')
    const userMessage = {
        user: query,
    };
    messages.push({role:'user', content: JSON.stringify(userMessage)});

    while (true) {
        const chat = await client.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            response_format: {type: 'json_object'}
        });
        const result = chat.choices[0].message.content;
        messages.push({role:'assistant', content: result})

        const action = JSON.parse(result);

        if (action.type === 'output') {
            Console.log(`bot: ${action.output}`)
            break;
        } else if (action.type == 'action') {
            const fn = tools[action.function];
            if (!fn) throw new Error('Invalid Tool Call')
            const observation = fn(action.input);
            observationMessage = {
                type: 'observation',
                observation: observation,
            }
            messages.push({role: 'developer', content: JSON.stringify(observationMessage)})
        }
    }
}