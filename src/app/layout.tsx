import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
// import { Providers } from "@/redux/providers";
import Template from "../components/template/template";
import { ApolloWrapper } from "@/lib/apollo-wrapper";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smokemap Next App",
  description: "Map of places generated by humans for humans",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en">
        <body className={inter.className}>
          <ApolloWrapper>
            {/* <Providers> */}
            <Template>{children}</Template>
            {/* {children} */}
            {/* </Providers> */}
          </ApolloWrapper>
          <Toaster />
        </body>
      </html>
  );
}
