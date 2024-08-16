import {HumanMessage} from '@langchain/core/messages';
import {ChatGoogleGenerativeAI} from '@langchain/google-genai';
import {HarmBlockThreshold, HarmCategory} from '@google/generative-ai';
import './style.css';
import {ChatPromptTemplate, MessagesPlaceholder} from '@langchain/core/prompts';
import { RunnableSequence, RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatMessageHistory } from 'langchain/memory';
import pg from 'pg';
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import {Connector} from '@google-cloud/cloud-sql-connector';

const {Pool} = pg;

const form = document.querySelector('form');
const promptInput = document.querySelector('input[name="prompt"]');
const output = document.querySelector('.output');

const history = new ChatMessageHistory([]);

form.onsubmit = async ev => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  try {
    const connector = new Connector();
    const clientOpts = await connector.getOptions({
        instanceConnectionName: 'aic-triumphants-001001001:us-central1:aic-triumphants',
        authType: 'IAM'
    });
    const poolConfig = {
      ...clientOpts,
      user: 'aic-triumphants@aic-triumphants-001001001.iam',
      database: 'chatHistory',
    };
    
    const pool = new Pool(poolConfig);
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a helpful assistant. Answer all questions to the best of your ability.",
      ],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
    ]);

    // Call the multimodal model, and get a stream of results
    const model = new ChatGoogleGenerativeAI({
      apiKey: 'AIzaSyCj8_4rGPoeHo_GbUQmH3qhI2s_8wGU2OU',
      modelName: 'gemini-1.5-flash', // or gemini-1.5-pro
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const chain = RunnableSequence.from([
      prompt,
      model,
      new StringOutputParser,
    ]);

    const chat = new RunnableWithMessageHistory({
      runnable: chain,
      // getMessageHistory: (_sessionId) => history,
      getMessageHistory: async (sessionId) => {
        const chatHistory = new PostgresChatMessageHistory({
          sessionId,
          pool,
          // Can also pass `poolConfig` to initialize the pool internally,
          // but easier to call `.end()` at the end later.
        });
        return chatHistory;
      },
      inputMessagesKey: 'input',
      historyMessagesKey: "chat_history",
    })

    const response = await chat.invoke(
      {
        input: promptInput.value,
      },
      {configurable: {sessionId: "unsued",},},
    );

    output.textContent = response;
    await pool.end();
  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

