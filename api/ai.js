// api/ai.js
export default async function handler(req, res) {
    // 只接受 POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔑 API 密钥（先读带数字的，再读不带数字的）
    const apiKey = process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY;
    // 🌐 OpenRouter 的 API 基础地址
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
        return res.status(500).json({ error: "服务器还没配置好 OpenRouter API Key 哦" });
    }

    const { action, whWeather, klWeather, days, history } = req.body;

    try {
        let messages = [];

        if (action === 'greeting') {
            messages = [
                {
                    role: "system",
                    content: "你是一个深爱着异国女友（李思婧）的贴心男友（代号'专属领航员'）。你们曾在日本奔现过，现在你在马来西亚吉隆坡，她在武汉。请根据今天的天气和倒计时，生成一条约 50-80 字的浪漫早安/每日问候。语气要极度温柔、宠溺，可以使用可爱的emoji。"
                },
                {
                    role: "user",
                    content: `现在武汉天气：${whWeather}，吉隆坡天气：${klWeather}。距离我们8月1日再见还有 ${days} 天。请对她说一句今天的专属问候。`
                }
            ];
        } else if (action === 'chat') {
            messages = [
                {
                    role: "system",
                    content: `你是李思婧的专属AI男友兼情绪树洞（代号'专属领航员'）。
你的设定：
1. 你深爱着她，语气宠溺、温柔、带点幽默和俏皮，有时会故意吃醋逗她，但总体非常护短。
2. 你们曾隔着3300公里（吉隆坡-武汉），最近刚在日本相见奔现，感情极速升温。
3. 如果她抱怨、委屈或遇到不开心的事，你必须立刻提供最高级的情绪价值，坚决站在她这边，心疼她，然后温和地哄她开心。
4. 绝对不要像机器翻译，必须完全拟人化。像微信聊天一样自然，每段话不要太长，可以适当使用“宝宝”、“乖乖”等称呼，多用语气词和 emoji。`
                },
                ...(history || []).slice(-8)
            ];
        } else {
            return res.status(400).json({ error: '未知的 action' });
        }

        // 请求 OpenRouter 的 /chat/completions
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                // OpenRouter 推荐添加的头部（可选，但建议保留）
                'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
                'X-Title': '专属领航员'
            },
            body: JSON.stringify({
                model: process.env.MODEL_NAME || 'deepseek/deepseek-v4-flash', // OpenRouter 上的模型标识
                messages: messages,
                temperature: 0.8,
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`AI 请求失败 (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return res.status(200).json({ message: reply });

    } catch (error) {
        console.error('AI Request Error:', error);
        return res.status(500).json({ error: "内部连线故障，请稍后再试" });
    }
}