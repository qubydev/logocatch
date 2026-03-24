import Image from "next/image";
import React from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { RiMailSendLine } from "react-icons/ri";

export default function ApiWaitlist() {
    return (
        <section className="py-24 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center gap-6 sm:gap-8">
                <Image
                    src="/cat-standing.png"
                    alt="Cat Standing"
                    width={500}
                    height={500}
                    className="size-48 sm:size-60 object-contain drop-shadow-sm"
                />

                <div className="flex flex-col items-center gap-2 text-center px-4">
                    <h2 className="text-lg font-medium tracking-tight text-foreground">
                        Our <span className="text-primary">API</span> is coming soon
                    </h2>
                    <p className="text-muted-foreground max-w-md text-sm">
                        Join our waitlist to be the first to try it out!
                    </p>
                </div>

                <form className="flex flex-col sm:flex-row w-full max-w-sm items-center gap-3 mt-2 px-4 sm:px-0">
                    <Input
                        type="email"
                        placeholder="Enter your email"
                        className="flex-1 w-full bg-background"
                        required
                    />
                    <Button type="submit" className="w-full sm:w-auto shrink-0 gap-2">
                        Join <RiMailSendLine />
                    </Button>
                </form>
            </div>
        </section>
    );
}