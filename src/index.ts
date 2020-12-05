import { exec } from 'child_process';
import { argv } from 'process';
import io from 'socket.io-client';

interface AppArguments {
    port?: string;
    ip?: string;
    name?: string;
}

const deployProject = (command: string,project: string, socket: SocketIOClient.Socket) => {
    const child = exec(command);
    child.stdout?.on('data', (data) => {
        console.log(`stdout: ${data}`);
        socket.emit('deploy-stdout', data, project);
    });

    child.stderr?.on('data', (data) => {
        socket.emit('deploy-stderr', data, project);
        console.error(`stderr: ${data}`);
    });

    child.on('close', (code) => {
        socket.emit('deploy-exit', code, project);
        console.log(`子进程退出，退出码 ${code}`);
    });
};

const main = () => {
    const args = argv
        .filter(arg => arg.startsWith('-'))
        .reduce<AppArguments>((p, c) => {
            const reg = /^-(\w+)=(.+)$/.exec(c);
            if (!reg) {
                throw new Error(`启动参数异常: ${c}`);
            }
            p[reg[1] as keyof AppArguments] = reg[2];
            return p;
        }, {});
    let { ip, port, name } = args;
    ip = ip || '127.0.0.1';
    port = port || '7001';
    console.log(args);
    const socket = io(`http://127.0.0.1:7001`, {
        query: {
            type: 'continue-deploy',
            role: 'worker',
            name
        }
    });
    socket.on('connect', () => {
        console.log('ciallo');
    });
    socket.on('deploy-git-project', (command: string, project: string) => deployProject(command, project, socket));
};
main();  