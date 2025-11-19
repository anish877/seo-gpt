"use client"

import { cn } from "@/lib/utils"

import { FloatingElements } from "@/components/ui/floating-elements"

const logos = [
  {
    img: "https://res.cloudinary.com/duli9q35f/image/upload/v1740179100/skyLogo_zi6fow.jpg",
    link: "#",
    bgColor: "logo-bg-1",
  },
  {
    img: "https://res.cloudinary.com/duli9q35f/image/upload/v1740179065/wearecasinoLogo_bffqz7.gif",
    link: "#",
    bgColor: "logo-bg-2",
  },
  {
    img: "https://res.cloudinary.com/duli9q35f/image/upload/v1740179065/pixwinLogo_kmwxzv.svg",
    link: "#",
    bgColor: "logo-bg-3",
  },
  {
    img: "https://res.cloudinary.com/duli9q35f/image/upload/v1740179065/wearelotteryLogo_n5fz08.png",
    link: "#",
    bgColor: "logo-bg-4",
  },
  {
    img: "https://res.cloudinary.com/duli9q35f/image/upload/v1740179065/socketLogo_ct5obw.png",
    link: "#",
    bgColor: "logo-bg-5",
  },
  {
    img: "https://res.cloudinary.com/duli9q35f/image/upload/v1740179065/paysureLogo_pvo0zh.png",
    link: "#",
    bgColor: "logo-bg-6",
  },
  {
    img: "https://res.cloudinary.com/duli9q35f/image/upload/v1740179064/kudipalLogo_ha6a43.png",
    link: "#",
    bgColor: "logo-bg-7",
  },
  {
    img: "/blue_ocean_global_technology_logo.jpg",
    link: "#",
    bgColor: "logo-bg-8",
  },
]

export default function FloatingElementsDemo() {
  return (
    <FloatingElements 
      title="Trusted by" 
      className="py-20"
      titleClassName="text-5xl font-light tracking-tight"
    >
      {logos.map((logo, i) => (
        <a
          key={i}
          href={logo.link}
          className={cn(
            `relative flex h-32 w-32 items-center justify-center rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out hover:scale-105 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]`,
            logo.bgColor
          )}
        >
          <img
            src={logo.img}
            alt={`${logo.link} logo`}
            className="h-24 w-24 object-contain"
          />
        </a>
      ))}
    </FloatingElements>
  )
}
