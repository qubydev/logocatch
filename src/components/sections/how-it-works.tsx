"use client";

import Image from "next/image";
import { FaArrowRight } from "react-icons/fa6";

const steps = [
    {
        num: "01",
        title: "Smart Extraction",
        description: <span><span className="text-primary">logocat is smart.</span> We use multiple strategies to dig deep and find the perfect logo hidden in the metadata or DOM.</span>,
        illustration: "/card-1.png",
    },
    {
        num: "02",
        title: "Parallel Processing",
        description: <span>We are fast. <span className="text-primary">Multiple logocats work for you</span> in parallel, racing through different extraction methods simultaneously.</span>,
        illustration: "/card-2.png",
    },
    {
        num: "03",
        title: "AI Fallback",
        description: <span>When standard methods fail, logocat isn't done. He asks our <span className="text-primary">AI vision model</span> to analyze the page and spot the logo.</span>,
        illustration: "/card-3.png",
    },
];

export default function HowItWorks() {
    return (
        <section className="py-24 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center mb-16 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
                    How <span className="text-primary font-handlee">logocat</span> works
                </h2>

                <p className="text-muted-foreground text-lg max-w-2xl">
                    Our extraction engine uses a multi-layered approach to almost guarantee we find the right logo.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 overflow-hidden rounded-tl-xl rounded-bl-xl md:rounded-bl-none md:rounded-tr-xl">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className="group relative flex flex-col h-full min-h-[400px] sm:min-h-[480px] p-8 sm:p-10 hover:bg-secondary/20 transition-colors duration-500 cursor-default"
                    >
                        <div className="text-4xl sm:text-5xl font-light text-foreground/30 tracking-tighter">
                            {step.num}
                        </div>

                        <div className="flex-1 flex items-center justify-center w-full relative py-8">
                            <div className="relative size-32 sm:size-44 transition-transform duration-300 hover:scale-110">
                                <Image
                                    src={step.illustration}
                                    alt={step.title}
                                    fill
                                    className="object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <FaArrowRight className="size-3 sm:size-4 text-muted-foreground shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                                <h3 className="font-medium text-lg sm:text-xl text-foreground tracking-tight">
                                    {step.title}
                                </h3>
                            </div>

                            <p className="text-sm text-muted-foreground pl-6 sm:pl-7 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                                {step.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}