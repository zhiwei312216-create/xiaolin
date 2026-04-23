import type { SourceGetter } from '../model'
import net from 'net';

// 🕵️ 魔法工具 1：解密节点，提取 IP 和 端口
function getTarget(link: string): { host: string, port: number } | null {
    try {
        if (link.startsWith('vmess://')) {
            const jsonStr = Buffer.from(link.slice(8), 'base64').toString('utf-8');
            const config = JSON.parse(jsonStr);
            return { host: String(config.add), port: Number(config.port) };
        } else {
            // 处理 vless, trojan, ss 等格式
            const match = link.match(/@([^:]+):(\d+)/);
            if (match) return { host: match[1], port: Number(match[2]) };
        }
    } catch(e) {}
    return null;
}

// 🚪 魔法工具 2：极速敲门测试 (TCP Ping)
async function ping(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000); // 只等2秒，连不上直接判定为死节点！
        
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        
        socket.connect(port, host);
    });
}

const _: SourceGetter = async () => {
    // 咱们换一个更大的源，这样就算死掉一批，剩下的活节点也够你用
    const source = 'https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/sub_merge.txt'
    
    try {
        const res = await fetch(source);
        let text = await res.text();
        
        // 智能识别：如果是全 Base64 加密的源，先帮它脱马甲
        if (!text.includes('://')) {
            text = Buffer.from(text, 'base64').toString('utf-8');
        }
        
        // 第一步：粗筛出纯净的台湾节点
        const twNodes = text.split('\n').filter(line => {
            if (!line.includes('://')) return false;
            const isTW = line.includes('TW') || line.includes('台湾') || line.includes('Hinet');
            const isMY = line.includes('MY') || line.includes('Malaysia'); // 顺手防一波你的大马服务器
            return isTW && !isMY;
        });

        console.log(`👀 初筛找到 ${twNodes.length} 个台湾节点，开始质检...`);
        
        // 第二步：精筛，开始敲门测试！
        const aliveNodes: string[] = [];
        
        // 并发敲门，不管多少个节点，几秒钟搞定
        await Promise.all(twNodes.map(async (link) => {
            const target = getTarget(link);
            if (target && target.host && target.port) {
                const isAlive = await ping(target.host, target.port);
                if (isAlive) {
                    aliveNodes.push(link); // 活的！收编进队！
                }
            } else {
                // 如果是特殊格式解析不出来，防误杀先留着
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
