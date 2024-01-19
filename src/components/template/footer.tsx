export default function Footer() {
  const d = new Date();
  const currentYear = d.getFullYear();
  return (
    <footer className="absolute m-4 bottom-0 w-full">
      <div className="w-full max-w-screen-xl mx-auto p-4 md:py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400">
            <li>
              <a href="/about" className="hover:underline me-4 md:me-6">
                About
              </a>
            </li>
            <li>
              <a href="/privacy" className="hover:underline me-4 md:me-6">
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>
        <hr className="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
        <span className="block text-sm text-gray-500 sm:text-center dark:text-gray-400">
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
