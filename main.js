import {HumanMessage} from '@langchain/core/messages';
import {ChatGoogleGenerativeAI} from '@langchain/google-genai';
import {HarmBlockThreshold, HarmCategory} from '@google/generative-ai';
import './style.css';
import {ChatPromptTemplate, MessagesPlaceholder} from '@langchain/core/prompts';
import { RunnableSequence, RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatMessageHistory } from 'langchain/memory';

const form = document.querySelector('form');
const promptInput = document.querySelector('input[name="prompt"]');
const output = document.querySelector('.output');

const history = new ChatMessageHistory([]);

form.onsubmit = async ev => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  try {
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
      apiKey: 'AIzaSyDWDRCfoBi5WRy_8TYroLKuZvVQiG8WrvA',
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
      getMessageHistory: (_sessionId) => history,
      inputMessagesKey: 'input',
      historyMessagesKey: "chat_history",
    })

    await chat.invoke(
      {
        input: promptInput.value,
      },
      {configurable: {sessionId: "unsued",},},
    );

    const message = await history.getMessages();
    console.log(JSON.stringify(message));
    output.textContent = message.map(m => `${m.lc_id[2] === "HumanMessage" ? "You" : "AI"} ${m.content} test` ).join('\n');
  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

