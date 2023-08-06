<!-- <div align="center"> -->
<img src="./docs/images/icon.svg" alt="icon"/>

<!-- <h1 align="center">ChatGPT Next Web</h1> -->

### 暂时不支持docker

## Requirements

NodeJS >= 18, Docker >= 20

# Start

## Create .env
```
cp .env.template .env.local
```

### Environment Variables

> [简体中文 > 如何配置 api key、访问密码、接口代理](./README_CN.md#环境变量)

### `OPENAI_API_KEY` (required)

Your openai api key.

### `CODE` (optional)

Access passsword, separated by comma.

### `BASE_URL` (建议必须填入，否则会出现proxy填入正确也会无法访问的情况。template默认的即可)

> Default: `https://api.openai.com`

> Examples: `http://your-openai-proxy.com`

Override openai api request base url.

### `OPENAI_ORG_ID` (optional)

Specify OpenAI organization ID.

### `HIDE_USER_API_KEY` (optional)

> Default: Empty

If you do not want users to input their own API key, set this value to 1.

### `DISABLE_GPT4` (optional)

> Default: Empty

If you do not want users to use GPT-4, set this value to 1.

### `HIDE_BALANCE_QUERY` (optional)

> Default: Empty

If you do not want users to query balance, set this value to 1.


## Install dependencies
```
npm install
```

## Debug start
```
npm run dev
```

## open "http://localhost:3000/#/chat"





## Development

> [简体中文 > 如何进行二次开发](./README_CN.md#开发)

Before starting development, you must create a new `.env.local` file at project root, and place your api key into it:

```
OPENAI_API_KEY=<your api key here>

# if you are not able to access openai service, use this BASE_URL
BASE_URL=https://chatgpt1.nextweb.fun/api/proxy
```
