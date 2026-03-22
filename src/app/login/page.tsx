"use client";

import React from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function Login() {
    const handleLogin = async (provider: string) => {
        await authClient.signIn.social({ provider });
    };

    return (
        <div className='h-[70vh] flex items-center justify-center'>
            <Card className='w-full max-w-sm'>
                <CardHeader>
                    <CardTitle>Login to continue</CardTitle>
                </CardHeader>
                <CardContent className='flex flex-col gap-2'>
                    <Button onClick={() => handleLogin('github')} size="lg">Login with Github</Button>
                    <Button onClick={() => handleLogin('google')} size="lg">Login with Google</Button>
                </CardContent>
            </Card>
        </div>
    )
}
