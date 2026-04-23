import type { SourceGetter } from '../model'
import net from 'net';

function getTarget(link: string): { host: string, port: number } | null {
    try {
        if (link.startsWith('vmess://')) {
            const jsonStr = Buffer.from(link.slice(8), 'base64').toString('utf-8');
            const config = JSON.parse(jsonStr);
            return { host: String(config.add), port: Number(config.port) };
        } else {
            const match = link.match(/@([^:]+):(\d+)/);
            if (match) return { host: match[1], port: Number(match[2]) };
        }
    } catch(e) {}
    return null;
}

async function ping(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        
        // 🚨 关键修改 1：把 2000 放宽到 5000（给跨洋网络 5 秒的容错时间）
        socket.setTimeout(5000); 
        
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        
        socket.connect(port, host);
    });
}

const _: SourceGetter = async () => {
    // 🚨 关键修改 2：咱们多加几个有名的全网聚合源，扩大原材料基数
    const sources = [
        'https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/sub_merge.txt',
        'https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray',
        'https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt'
    ];
    
    let allText = '';
    
    try {
        // 把几个鱼塘的水全部抽干，汇总到一起
        for (const url of sources) {
            try {
                const res = await fetch(url);
                allText += await res.text() + '\n';
            } catch (e) {
                console.log(`获取源失败，跳过: ${url}`);
            }
        }
        
        if (!allText.includes('://')) {
            allText = Buffer.from(allText, 'base64').toString('utf-8');
        }
        
        // 第一步：初筛（去重并保留台湾）
        const uniqueNodes = [...new Set(allText.split('\n'))]; // 先去个重
        const twNodes = uniqueNodes.filter(line => {
            if (!line.includes('://')) return false;
            const isTW = line.includes('TW') || line.includes('台湾') || line.includes('Hinet');
            const isMY = line.includes('MY') || line.includes('Malaysia');
            return isTW && !isMY;
        });

        console.log(`👀 初筛找到 ${twNodes.length} 个台湾节点，开始质检...`);
        
        // 第二步：精筛（5秒宽容度敲门测试）
        const aliveNodes: string[] = [];
        await Promise.all(twNodes.map(async (link) => {
            const target = getTarget(link);
            if (target && target.host && target.port) {
                const isAlive = await ping(target.host, target.port);
                if (isAlive) {
                    aliveNodes.push(link);
                }
            } else {
                aliveNodes.push(link); 
            }
        }));

        console.log(`✅ 质检完毕！最终存活可用节点：${aliveNodes.length} 个`);
        return aliveNodes;
        
    } catch (e) {
        return [];
    }
}

export default _
