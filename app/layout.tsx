import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PICK ONE｜选择困难决策机",
  description: "把纠结交给概率：支持加权轮盘、快速抽选和淘汰赛，并用失望测试帮你发现真实偏好。",
  keywords: ["选择困难", "随机选择器", "在线轮盘", "决策工具"],
  icons: { icon: "./favicon.svg" },
  openGraph: { title: "PICK ONE｜选择困难决策机", description: "结果不一定比你聪明，但它一定比你更果断。", type: "website", locale: "zh_CN" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
