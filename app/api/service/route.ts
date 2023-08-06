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

  // 使用正则去掉ipython的噪点字符
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

  // 删除stdOut以及stdIn的提示字符
  private static removeNoise(text: string): string {
    // 第一步：删除字符串首尾类似“In [2]:”的子字符串
    // 第二步：删除ANSI转义代码（颜色等信息）
    return text
      .replace(/^(Out\ *\[\d+\]:\ *)|(In \[\d+\]:\ *)$/gm, "")
      .replace(/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g, "");
  }

  // 发送Python代码到子进程并返回一个Promise<string>来处理执行结果
  public runCode(code: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let outputList: string[] = [];

      // 监听子进程的标准输出，获取执行结果
      this.pythonProcess.stdout?.on("data", (data) => {
        // 首先删除首位空格以帮助我们正则校验
        const output = data.toString().trim();
        outputList.push(output);

        console.log("round outputList:", outputList);
        // console.log("------------");

        // 如果打印为空就会出现连续两次打印的是一致的情况
        if (
          outputList.length >= 2 &&
          outputList[outputList.length - 1] ==
            outputList[outputList.length - 2] &&
          output != "...:"
        ) {
          outputList = [];
          resolve(
            "The code is successfully executed, but the printed value is empty",
          );
        }

        if (
          !PythonShell.isOnlySpecificCharacters(output) &&
          !PythonShell.hasOnlySpecificCharacters(output)
        ) {
          // 将输出作为字符串类型的结果解析
          const result =
            output === "" ? "" : PythonShell.removeNoise(String(output)).trim();

          outputList = [];
          resolve(result);
        }
      });

      // 监听子进程的错误输出(一直监听)
      this.pythonProcess.stderr?.on("data", (data) => {
        // python存在噪点输出
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
          resolve(stdout.toString());
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
