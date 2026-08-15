export default function Footer() {
  const d = new Date();
  const currentYear = d.getFullYear();
  return (
    <footer className="absolute bottom-0 m-0 w-full">
      <div className="mx-auto w-full max-w-screen-xl p-0 md:py-0">
        <div className="">
          <ul className="mb-0 flex flex-wrap items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400">
            <li>
              <a href="/about" className="me-4 hover:underline md:me-6">
                About
              </a>
            </li>
            <li>
              <a href="/privacy" className="me-4 hover:underline md:me-6">
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>
        {/* <hr className="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" /> */}
        <span className="block text-center text-sm text-gray-500 dark:text-gray-400">
          {" "}
          © {currentYear}{" "}
          <a href="https://flowbite.com/" className="hover:underline">
            DaMi™
          </a>
          . All Rights Reserved.
        </span>
      </div>
    </footer>
  );
}
