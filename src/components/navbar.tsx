"use client";

import Image from 'next/image'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { FaArrowRight } from "react-icons/fa";

export default function Navbar() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<any>(null);
    const session = sessionData?.session;
    const isLoggedIn = !!session;

    const fetchSession = async () => {
        const { data } = await authClient.getSession();
        setSessionData(data);
    };

    useEffect(() => {
        fetchSession();
    }, []);

    return (
        <div className='w-full h-14 flex items-center px-4'>
            <Link href="/" className='flex items-center gap-2'>
                <Image
                    src="/logo.png"
                    alt="Logo"
                    width={100}
                    height={100}
                    className='size-10'
                />
                <h1 className='font-bold text-[22px] hidden sm:block text-primary'>logocat</h1>
            </Link>
            <div className='ml-auto flex items-center gap-2'>
                <a href="https://qubydev.vercel.app/" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-all duration-300'>
                    <Image
                        src="/site.svg"
                        alt="Portfolio"
                        width={100}
                        height={100}
                        className='size-9'
                    />
                </a>
                <a href="https://github.com/qubydev" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-all duration-300'>
                    <Image
                        src="/github.svg"
                        alt="GitHub"
                        width={100}
                        height={100}
                        className='size-9'
                    />
                </a>
                <a href="https://linkedin.com/in/qubydev" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-all duration-300'>
                    <Image
                        src="/linkedin.svg"
                        alt="LinkedIn"
                        width={100}
                        height={100}
                        className='size-9'
                    />
                </a>
                {isLoggedIn && (
                    <Button
                        onClick={() => router.push("/login")}
                    >
                        Login <FaArrowRight />
                    </Button>
                )}
            </div>
        </div>
    )
}
