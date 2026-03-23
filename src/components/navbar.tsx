"use client";

import Image from 'next/image'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { FaArrowRight } from "react-icons/fa";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MdLogout } from "react-icons/md";
import { FaDiamond } from "react-icons/fa6";

export const UserBalance = () => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchBalance = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/balance");
            const data = await response.json();
            setBalance(data.balance);
        } catch (error) {
            console.error("Error fetching balance:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, []);

    return (
        <div className='p-2 rounded-sm'>
            <p className='flex items-center pl-2 justify-center'>
                <FaDiamond className='mr-2 size-3.5' />
                {loading ? "Loading..." : `${balance} credits`}
            </p>
        </div>
    )
};

export default function Navbar() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<any>(null);
    const session = sessionData?.session;
    const user = sessionData?.user;
    const isLoggedIn = !!session;
    const [isMounted, setIsMounted] = useState(false);

    const fetchSession = async () => {
        try {
            const sessionData = await authClient.getSession();
            setSessionData(sessionData.data);
        } catch (error) {
            console.error("Error fetching session:", error);
        } finally {
            setIsMounted(true);
        }
    };

    useEffect(() => {
        fetchSession();
    }, []);

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    window.location.href = "/";
                },
            },
        });
    };

    return (
        <div className='w-full h-14 flex items-center px-4'>
            <Link href="/" className='flex items-center gap-2'>
                <Image
                    src="/logo.svg"
                    alt="Logo"
                    width={100}
                    height={100}
                    className='size-10'
                />
                <h1 className='font-bold text-[22px] hidden sm:block text-primary font-handlee'>logocat</h1>
            </Link>
            <div className='ml-auto flex items-center gap-2'>
                <a href="mailto:malay77patra@gmail.com" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-all duration-300'>
                    <Image
                        src="/email.svg"
                        alt="Email"
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

                {isMounted ? isLoggedIn ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger className='border-2 border-primary rounded-full'>
                            <Avatar>
                                <AvatarImage src={user.image} alt={user.name} />
                                <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-54'>
                            <DropdownMenuLabel>
                                <p className='font-bold text-primary'>{user.name}</p>
                                <p>{user.email}</p>
                            </DropdownMenuLabel>
                            <UserBalance />
                            <Button className='w-full mt-2' onClick={handleLogout} size="lg">
                                Logout <MdLogout />
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button
                        onClick={() => router.push("/login")}
                    >
                        Login <FaArrowRight />
                    </Button>
                ) : null}
            </div>
        </div>
    )
}
