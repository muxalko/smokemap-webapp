import Head from "next/head";
import Link from "next/link";

const Privacy = () => {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        
        <Link href="/">Back</Link>
        <Link
          href="https://www.iubenda.com/privacy-policy/68260466"
          title="Privacy Policy"
        >
          Privacy Policy
        </Link>
      </main>
    </>
  );
};

export default Privacy;
