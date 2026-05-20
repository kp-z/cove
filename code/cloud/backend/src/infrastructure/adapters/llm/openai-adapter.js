"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIAdapter {
    client;
    model;
    defaultMaxTokens;
    constructor(apiKey, model, maxTokens, baseURL) {
        this.client = new openai_1.default({ apiKey, baseURL });
        this.model = model || 'gpt-4o';
        this.defaultMaxTokens = maxTokens || 4096;
    }
    async generateResponse(params) {
        const response = await this.client.chat.completions.create({
            model: this.model,
            max_tokens: params.maxTokens || this.defaultMaxTokens,
            messages: [
                { role: 'system', content: params.systemPrompt },
                ...params.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
        });
        return response.choices[0]?.message?.content || '';
    }
}
exports.OpenAIAdapter = OpenAIAdapter;
