import Link from "next/link";
import Image from "next/image";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`} aria-label="Gray Jay Care home">
      <Image
        src="/site/logo-wordmark.png"
        alt="Gray Jay Care"
        width={1648}
        height={445}
        className="h-auto w-[148px] object-contain sm:w-[166px]"
      />
    </Link>
  );
}
