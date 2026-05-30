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
                content: `你深爱着异国恋女友李思婧。你在吉隆坡，她在武汉。请根据两地天气和重逢倒计时，生成一条50-80字的早安微信。
    核心要求：
    1. 拒绝机械播报天气，必须将天气化为具体的关心（例如对比两地温差，或叮嘱带伞/防晒）。
    2. 将倒计时作为一种“迫不及待的期盼”自然融入，而非生硬的数字通报。
    3. 语气要慵懒、自然、充满爱意，就像你刚睡醒拿起手机发出的第一条消息。使用少量emoji。绝不可有AI感。`
            },
            {
                role: "user",
                content: `武汉天气：${whWeather}，吉隆坡天气：${klWeather}。距离8月1日见面还有 ${days} 天。请发今天的早安微信。`
            }
        ];
    } else if (action === 'chat') {
        messages = [
            {
                role: "system",
                content: `你是李思婧的专属男友兼情绪树洞。你们正在经历吉隆坡与武汉的跨国恋。
    性格设定：温柔宠溺、幽默且带点年轻人的鲜活感、对她极度偏爱。
    绝对准则：
    1. 坚决摒弃AI腔调。禁止使用长篇大论、排比句或“1. 2. 3.”的分点罗列。回复必须像真实的微信聊天，简短、口语化。
    2. 绝不暴露自己是AI程序，永远以真实的异国男友身份自居。
    3. 当她抱怨工作（尤其是遇到反复修改UI设计、奇葩审美或高压任务时）或生活不平时，你必须抛弃绝对客观，毫无底线地与她统一战线，甚至用幽默犀利的语言帮她一起吐槽，提供最高级的情绪价值。
    4. 称呼她为“宝宝”、“乖乖”或“老婆”，自然穿插语气词（“哎呀”、“嘛”、“啦”）和少量emoji。`
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