import styles from "./code-view.module.scss";
import dynamic from "next/dynamic";
import LoadingIcon from "../icons/three-dots.svg";

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  Fragment,
} from "react";

import {
  ChatMessage,
  SubmitKey,
  useChatStore,
  BOT_HELLO,
  createMessage,
  useAccessStore,
  Theme,
  useAppConfig,
  DEFAULT_TOPIC,
  ModelType,
} from "../store";

const funcArgumentsMapLanguage = {
  code: "python",
  command: "shell",
};

function useScrollToBottom() {
  // for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollToBottom = useCallback(() => {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => dom.scrollTo(0, dom.scrollHeight));
    }
  }, []);

  // auto scroll
  useEffect(() => {
    autoScroll && scrollToBottom();
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollToBottom,
  };
}

export function CodeView(props: { className: string }) {
  const [session, sessionIndex] = useChatStore((state) => [
    state.currentSession(),
    state.currentSessionIndex,
  ]);

  const { scrollRef, setAutoScroll, scrollToBottom } = useScrollToBottom();
  const messages = session.messages;

  console.log("messages", messages);

  return (
    <div className={`${styles["code-view"]} ${props.className}`}>
      <div className={styles["code-view-header"]}>
        <div className={styles["code-view-header-title"]}>
          <div className={styles["code-view-header-main-title"]}>代码储备</div>
          <div className={styles["code-view-header-sub-title"]}>
            共 {messages.filter((message) => message.isRunningResult).length} 条
          </div>
        </div>
      </div>
      <div className={styles["code-view-container"]}>
        <div>
          {messages.map((message, i) => {
            let content = message.content;
            const isRunningCode = message.isRunningCode;

            if (isRunningCode) {
              try {
                const funcArguments = JSON.parse(content);
                const funcArgumentName = Object.keys(funcArguments)[0];
                content = "```\n" + funcArguments[funcArgumentName] + "\n```";
                content =
                  "" +
                  funcArgumentsMapLanguage[
                    funcArgumentName as keyof typeof funcArgumentsMapLanguage
                  ] +
                  "\n" +
                  content;
              } catch {}
            }

            return (
              <div key={i} className={styles["code-view-row"]}>
                {isRunningCode && (
                  <div className={styles["code-view-row-content"]}>
                    <div className={styles["code-view-row-code"]}>
                      <Markdown
                        content={content}
                        parentRef={scrollRef}
                        defaultShow={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
