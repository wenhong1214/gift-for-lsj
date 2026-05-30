// api/ai.js
export default async function handler(req, res) {
    console.log('🚀 [DEBUG] Function invoked, method:', req.method);
    
    if (req.method !== 'POST') {
        console.log('❌ [DEBUG] Rejected non-POST request');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔑 关键：打印所有环境变量名（只打名字，不打值）
    console.log('📋 [DEBUG] Available env keys:', Object.keys(process.env).filter(k => k.includes('OPENROUTER') || k.includes('API')));
    
    // 尝试多个可能的变量名
    const apiKey = process.env.OPENROUTER_API_KEY 
        || process.env.OPENROUTER_API_KEY3 
        || process.env.OPENROUTER_API_KEY2;
    
    if (!apiKey) {
        console.error('🔥 [DEBUG] No OpenRouter API Key found in env vars!');
        console.error('   Checked: OPENROUTER_API_KEY, OPENROUTER_API_KEY3, OPENROUTER_API_KEY2');
        return res.status(500).json({ 
            error: 'API key not configured. Check Vercel environment variables.',
            debug: 'Missing OPENROUTER_API_KEY'
        });
    }
    
    console.log('✅ [DEBUG] API Key found, length:', apiKey.length);

    const { action, whWeather, klWeather, days, history } = req.body;
    console.log('📥 [DEBUG] Received action:', action);
    console.log('📥 [DEBUG] Weather:', { whWeather, klWeather });
    console.log('📥 [DEBUG] Days to meet:', days);
    if (history) {
        console.log('📥 [DEBUG] Chat history length:', history.length);
    }

    // 构建 messages
    let messages = [];
    if (action === 'greeting') {
        messages = [
            {
                role: "system",
                content: "你是一个深爱着异国女友（李思婧）的贴心男友。请根据天气和倒计时生成一条浪漫早安问候。50-80字，温柔宠溺，可用emoji。"
            },
            {
                role: "user",
                content: `武汉天气：${whWeather}，吉隆坡天气：${klWeather}。距离8月1日再见还有 ${days} 天。请对她说一句今天的专属问候。`
            }
        ];
    } else if (action === 'chat') {
        messages = [
            {
                role: "system",
                content: "你是李思婧的专属AI男友兼树洞。语气宠溺、温柔、幽默。如果她抱怨或不开心，坚决站她这边，哄她开心。像微信聊天一样自然，可以叫'宝宝'、'乖乖'，多用语气词和emoji。"
            },
            ...(history || []).slice(-8)
        ];
    } else {
        return res.status(400).json({ error: '未知的 action' });
    }

    try {
        console.log('🌐 [DEBUG] Sending request to OpenRouter...');
        console.log('🔄 [DEBUG] Models to try:', [
            "deepseek/deepseek-chat",
            "qwen/qwen-3-8b:free",
            "google/gemini-2.5-flash-lite:free"
        ]);
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                "HTTP-Referer": "https://gift-for-leesj.vercel.app"
            },
            body: JSON.stringify({
                models: [
                    "deepseek/deepseek-v4-flash",
                    "anthropic/claude-opus-4.8:fast",  
                    "openai/gpt-5.4-nano"   // 免费备选
                ],
                messages: messages,
                temperature: 0.8,
            })
        });

        console.log('📡 [DEBUG] OpenRouter response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [DEBUG] OpenRouter error body:', errorText);
            return res.status(500).json({ 
                error: 'AI 服务暂时不可用',
                debug: `Status ${response.status}: ${errorText.substring(0, 200)}`
            });
        }

        const data = await response.json();
        console.log('✅ [DEBUG] Got valid response from OpenRouter');
        
        if (!data.choices || data.choices.length === 0) {
            console.error('❌ [DEBUG] No choices in response:', JSON.stringify(data).substring(0, 500));
            return res.status(500).json({ error: 'AI 返回数据异常' });
        }

        const reply = data.choices[0].message.content;
        console.log('💬 [DEBUG] Reply preview:', reply.substring(0, 100));
        
        res.status(200).json({ message: reply });
        
    } catch (error) {
        console.error('🔥 [DEBUG] Fetch error:', error.message);
        console.error('🔥 [DEBUG] Error stack:', error.stack);
        res.status(500).json({ 
            error: '内部网络错误',
            debug: error.message
        });
    }
}