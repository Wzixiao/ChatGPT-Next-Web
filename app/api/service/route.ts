// import { repl, command } from "./function"
import { NextResponse } from "next/server";
// import { PythonShell } from "python-shell";
import { exec, spawn, ChildProcessWithoutNullStreams } from "child_process";

function isOnlySpecificCharacters(text: string) {
  const pattern = /^(>>> |\.\.\. )+$/;
  return pattern.test(text);
}

function hasOnlySpecificCharacters(
  s: string,
  allowedSubstrings: string[] = [
    "Python",
    "main",
    "GCC",
    "on",
    "help",
    "license",
  ],
) {
  return allowedSubstrings.every((substring) => s.includes(substring));
}

class PythonShell {
  private pythonProcess: ChildProcessWithoutNullStreams;
  private pythonContext: { [key: string]: any } = {};

  constructor() {
    // 创建一个Python子进程
    this.pythonProcess = spawn("ipython");

    // 监听子进程的标准输出，获取执行结果
    this.pythonProcess.stdout?.on("data", (data) => {
      const output = data.toString().trim();
      // console.log('Python Output:', output);

      // 将输出作为字符串类型的结果解析
      this.pythonContext["lastResult"] = output;
    });
  }

  // 发送Python代码到子进程并返回一个Promise<string>来处理执行结果
  public runCode(code: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      // 监听子进程的标准输出，获取执行结果（仅仅监听一次，如果使用on一直监听，我不知道什么时候输出会结束）
      this.pythonProcess.stdout?.once("data", (data) => {
        const output = data.toString().trim();
        console.log("Python Output:", output);

        // 将输出作为字符串类型的结果解析
        const result = output === "" ? "" : String(output);

        // 将结果存储到pythonContext对象中
        this.pythonContext["lastResult"] = result;

        resolve(result);
      });

      // 监听子进程的错误输出(一直监听)
      this.pythonProcess.stderr?.on("data", (data) => {
        // python存在噪点输出
        if (
          !isOnlySpecificCharacters(data.toString()) &&
          !hasOnlySpecificCharacters(data.toString())
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
const pythonShell = new PythonShell();

export function execute_python(code: string): Promise<string> {
  return pythonShell.runCode(code);
}

export function execute_shell(command: string): Promise<string> {
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

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Error", {
      status: 500,
      statusText: "request func is not POST",
    });
  }

  const funcArguments = await req.json();

  // 目前有且只有一个
  const funcArgumentName = Object.keys(funcArguments)[0];

  const func = functionMap[funcArgumentName as keyof typeof functionMap];

  let result;
  try {
    result = await func(funcArguments[funcArgumentName]);
  } catch (err) {
    result = err;
  }

  return NextResponse.json({
    data: result,
    code: 200,
  });
}

export const functionMap = {
  code: execute_python,
  command: execute_shell,
};

export const GET = handle;
export const POST = handle;

export const runtime = "nodejs";
