// import { repl, command } from "./function"
import { NextResponse } from "next/server";
import { PythonShell } from "python-shell";
import { exec } from "child_process";

const options = {
  pythonOptions: ["-u"],
};

export function execute_python(code: string): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const results = await PythonShell.runString(code, options);
      console.log("results", results);

      if (results.length == 0) {
        reject("Python script executed but no result was returned.");
      } else {
        resolve(results.join(""));
      }
    } catch (error: any) {
      reject(error["traceback"]);
    }
  });
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

export const functionsList = [
  {
    name: "execute_python",
    description:
      "Exexute python code. Args: code (String): It's just a python code string. Returns: CodeExecutionResponse: The result of the code execution.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          example: "print('Hello, World!')",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "execute_shell",
    description:
      "Run commands. Args:command(String): It's just a shell string. Returns: CommandExecutionResponse(String):: The result of the command execution.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          example: "ls -la",
        },
      },
      required: ["command"],
    },
  },
];

export const GET = handle;
export const POST = handle;

export const runtime = "nodejs";
