import "./globals.css";

export const metadata = {
  title: "AI Interview Platform",
  description: "Upload resume and generate interview link",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f9fc]">
        {children}
      </body>
    </html>
  );
}
