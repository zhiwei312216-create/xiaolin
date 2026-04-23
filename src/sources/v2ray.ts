import type { SourceGetter } from '../model'

const _: SourceGetter = async () => {
    // 🌊 超级鱼塘列阵：聚合了目前 GitHub 上更新最勤快的几个大库
    const sources = [
        'https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/sub_merge.txt',
        'https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray',
        'https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt',
        'https://raw.githubusercontent.com/tbbatbb/Proxy/master/main/all.txt',
        'https://raw.githubusercontent.com/a2470922/V2Ray-Share/main/Subscribe/v2ray.txt'
    ];
    
    let allText = '';
    
    try {
        for (const url of sources) {
            try {
                const res = await fetch(url);
                allText += await res.text() + '\n';
            } catch (e) {
                console.log(`获取源失败，跳过: ${url}`);
            }
        }
        
        // 智能脱马甲
        if (!allText.includes('://')) {
            allText = Buffer.from(allText, 'base64').toString('utf-8');
        }
        
        // 去重
        const uniqueNodes = [...new Set(allText.split('\n'))]; 
        
        // 核心过滤：只要台湾相关的，绝对不要马来西亚的
        const twNodes = uniqueNodes.filter(line => {
            if (!line.includes('://')) return false;
            // 增加 TPE, Taipei 等机场常用的缩写关键词
            const isTW = line.includes('TW') || line.includes('台湾') || line.includes('Hinet') || line.includes('Taipei') || line.includes('TPE');
            const isMY = line.includes('MY') || line.includes('Malaysia'); 
            return isTW && !isMY;
        });

        console.log(`🎉 暴力堆量完毕！共抓取到 ${twNodes.length} 个台湾节点！`);
        return twNodes; // 直接返回全部台湾节点，不做云端 TCP 测试！
        
    } catch (e) {
        return [];
    }
}

export default _
