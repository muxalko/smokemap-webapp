export default function Footer() {
  const d = new Date();
  const currentYear = d.getFullYear();
  return (
    <footer className="fixed bottom-0 left-0 z-20 w-full p-4 bg-white border-t border-gray-200 shadow md:flex md:items-center md:justify-between md:p-6 dark:bg-gray-800 dark:border-gray-600">
      <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
        © {currentYear}{" "}
        <a href="https://flowbite.com/" className="hover:underline">
          DaMi™
        </a>
        . All Rights Reserved.
      </span>
      <ul className="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 sm:mt-0">
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
    </footer>
  );
}
