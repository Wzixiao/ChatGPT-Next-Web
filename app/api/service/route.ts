import { NextResponse } from "next/server";
import { exec, spawn, ChildProcessWithoutNullStreams } from "child_process";

type CommandKey = "code" | "command";

type CommandExecutionData = { [K in CommandKey]: string } & (
  | { code: string }
  | { command: string }
);

interface CommandDetail {
  executionData: CommandExecutionData;
  pythonShellId: string | null;
}

class PythonShell {
  private pythonProcess: ChildProcessWithoutNullStreams;

  constructor() {
    // 创建一个Python子进程
    this.pythonProcess = spawn("ipython");
  }

  // 检查一个字符串是否只存在"...:"或者"In [xxx]:"
  private static isOnlySpecificCharacters(text: string) {
    const pattern = /^(>>>:|\.{3}:|In\ \[\d+\]:)+$/;
    return pattern.test(text);
  }

  // 检查这条语句是否为“启动横幅”（Banner）
  private static hasOnlySpecificCharacters(
    text: string,
    allowedSubstrings: string[] = [
      "Python",
      "main",
      "GCC",
      "on",
      "help",
      "license",
    ],
  ) {
    return allowedSubstrings.every((substring) => text.includes(substring));
  }

  // 删除在ipython中stdOut以及stdIn的提示字符
  private static removeNoise(text: string): string {
    // 第一步：删除字符串首尾类似“In [2]:”的子字符串
    // 第二步：删除ANSI转义代码（颜色等信息）
    return text
      .replace(/^(Out\ *\[\d+\]:\ *)|(In \[\d+\]:\ *)$/gm, "")
      .replace(/\x1b\[[0-9;]*m/g, "");
  }

  private static filterWraper(text: string): boolean {
    return (
      !PythonShell.isOnlySpecificCharacters(text) &&
      !PythonShell.hasOnlySpecificCharacters(text)
    );
  }

  // 发送Python代码到子进程并返回一个Promise<string>来处理执行结果
  public runCode(code: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let outputList: string[] = [];
      let timeoutHandle: NodeJS.Timeout | null = null;

      // 处理和返回输出的函数
      const handleOutput = () => {
        // 停止定时器
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        // 将输出作为字符串类型的结果解析
        const result = outputList
          .filter(PythonShell.filterWraper)
          .map(PythonShell.removeNoise)
          .join("")
          .trim();

        outputList = [];
        if (result === "") {
          resolve(
            "The code is successfully executed, but the printed value is empty",
          );
        } else {
          resolve(result);
        }
      };

      this.pythonProcess.stdout?.on("data", (data) => {
        const output = data.toString().trim();
        outputList.push(output);
        console.log(
          "output---------------------------------------------------",
        );
        console.log(output);

        // 如果已经有一个定时器运行，取消它
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        // 设置新的定时器
        timeoutHandle = setTimeout(handleOutput, 2000); // 等待2秒
      });

      this.pythonProcess.stderr?.on("data", (data) => {
        if (
          !PythonShell.isOnlySpecificCharacters(data.toString()) &&
          !PythonShell.hasOnlySpecificCharacters(data.toString())
        ) {
          console.error("Python Error:", JSON.stringify(data.toString()));
          reject(data.toString());
        }
      });

      // 发送Python代码到子进程
      this.pythonProcess.stdin?.write(code + "\n\n");
    });
  }

  // 在程序结束时，终止子进程
  public end(): void {
    this.pythonProcess.stdin?.end();
  }
}

// 使用Promise封装的PythonShell类
const pythonShells: Record<string, PythonShell> = {};

function executePythonCode(
  code: string,
  pythonShellId: string | null,
): Promise<string> {
  if (!pythonShellId) {
    return new Promise((resolve, reject) => {
      reject("pythonShellId is null");
    });
  }

  if (!(pythonShellId in pythonShells)) {
    pythonShells[pythonShellId] = new PythonShell();
  }

  return pythonShells[pythonShellId].runCode(code);
}

function executeShellCommand(command: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(
      command,
      null,
      (
        error: Error | null,
        stdout: string | Buffer,
        stderr: string | Buffer,
      ) => {
        if (stderr) {
          reject(stderr);
        } else {
          let stdoutStr = stdout.toString();
          // 如果返回值为空
          stdoutStr = stdoutStr
            ? stdoutStr
            : "The instruction was executed successfully, but there was no return value";
          resolve(stdoutStr);
        }
      },
    );
  });
}

const commandHandlers: Record<
  CommandKey,
  (arg: string, pythonShellId: string | null) => Promise<string>
> = {
  code: executePythonCode,
  command: executeShellCommand,
};

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Error", {
      status: 500,
      statusText: "request func is not POST",
    });
  }

  const commandDetails: CommandDetail = await req.json();

  const argumentName: CommandKey = Object.keys(
    commandDetails.executionData,
  )[0] as CommandKey;

  const func = commandHandlers[argumentName];

  let result;

  try {
    result = await func(
      commandDetails.executionData[argumentName],
      commandDetails.pythonShellId,
    );
  } catch (err) {
    result = err;
  }

  return NextResponse.json({
    data: result,
    code: 200,
  });
}

export const GET = handle;
export const POST = handle;

export const runtime = "nodejs";
