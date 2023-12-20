import Head from "next/head";
import Link from "next/link";

const Privacy = () => {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="h-screen w-screen">
          <iframe
            width={"100%"}
            height={"100%"}
            sandbox="allow-scripts allow-modal"
            loading="eager"
            title="Privacy Policy"
            src="https://www.iubenda.com/privacy-policy/68260466"
          ></iframe>
        </div>
        {/* <Link
          href="https://www.iubenda.com/privacy-policy/68260466"
          title="Privacy Policy"
        >
          Privacy Policy
        </Link> */}
        <Link href="/">Back</Link>
      </main>
    </>
  );
};

export default Privacy;
