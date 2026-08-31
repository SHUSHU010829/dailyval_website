// 後台的外框。data-native-cursor 放在這裡而不是頁面裡，有兩個理由：
// 之後多開 /admin/* 的路由會自動繼承，而且 min-h-screen 保證它至少蓋滿一
// 個視窗高——掛在一般的自動高度 div 上的話，登入畫面或空佇列那種內容很短
// 的情況下，下半個畫面其實落在 body 上，游標又不見了。
//
// 游標規則本身在 globals.css。

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-native-cursor className="min-h-screen">
      {children}
    </div>
  );
}
