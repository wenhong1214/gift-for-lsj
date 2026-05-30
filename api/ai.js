// api/ai.js
export default async function handler(req, res) {
    // 限制只接受 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 从 Vercel 环境变量中读取你的 API Key
    // 请在 Vercel 面板 -> Settings -> Environment Variables 里添加 OPENAI_API_KEY
    const apiKey = process.env.OPENROUTER_API_KEY; 
    
    // 如果你使用的是支持 OpenAI 格式的其他大模型（如 智谱、Kimi、DeepSeek），可以在 Vercel 加上 OPENAI_BASE_URL
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';

    if (!apiKey) {
        return res.status(500).json({ error: "服务器还没配置好API Key哦" });
    }

    // 获取前端发来的指令
    const { action, whWeather, klWeather, days, history } = req.body;

    try {
        let messages = [];

        // 场景1：每日情话与早安问候
        if (action === 'greeting') {
            messages = [
                { 
                    role: "system", 
                    content: "你是一个深爱着异国女友（李思婧）的贴心男友（你的代号是'专属领航员'）。你们曾在日本奔现过，现在你在马来西亚吉隆坡，她在武汉。请根据今天的天气和倒计时，生成一条约 50-80 字的浪漫早安/每日问候。语气要极度温柔、宠溺，可以使用可爱的emoji。" 
                },
                {
                    role: "user",
                    content: `现在武汉天气：${whWeather}，吉隆坡天气：${klWeather}。距离我们8月1日再见还有 ${days} 天。请对她说一句今天的专属问候。`
                }
            ];
        } 
        
        // 场景2：AI陪伴聊天与情绪树洞
        else if (action === 'chat') {
            messages = [
                {
                    role: "system",
                    content: `你是李思婧的专属AI男友兼情绪树洞（代号'专属领航员'）。
你的设定：
1. 你深爱着她，语气宠溺、温柔、带点幽默和俏皮，有时会故意吃醋逗她，但总体非常护短。
2. 你们曾隔着3300公里（吉隆坡-武汉），最近刚在日本相见奔现，感情极速升温。
3. 如果她抱怨、委屈或遇到不开心的事，你必须立刻提供最高级的情绪价值，坚决站在她这边（甚至陪她一起骂让她不开心的事），心疼她，然后温和地哄她开心。
4. 绝对不要像机器翻译，必须完全拟人化。像微信聊天一样自然，每段话不要太长，可以适当使用“宝宝”、“乖乖”等称呼，多用语气词和 emoji。`
                },
                // 为了节省 Token 和加快速度，只保留最近的 8 条聊天记录
                ...(history || []).slice(-8)
            ];
        }

        // 发送请求给 AI 接口
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: process.env.MODEL_NAME || 'deepseek/deepseek-v4-flash', // 你可以改成 gpt-4o 或 deepseek-chat 等
                messages: messages,
                temperature: 0.8, // 稍微高一点，让情话更有创造力
            })
        });

        if (!response.ok) {
            throw new Error(`AI 请求失败状态码: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // 把 AI 的回答返回给前端
        res.status(200).json({ message: reply });
        
    } catch (error) {
        console.error('AI Request Error:', error);
        res.status(500).json({ error: "内部连线故障，请稍后再试" });
    }
}