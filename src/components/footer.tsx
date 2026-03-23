import Image from 'next/image'
import React from 'react'
export default function Footer() {
    return (
        <footer className='flex flex-col md:flex-row justify-center px-4 py-8 gap-10 md:gap-0 relative pb-48 md:pb-4 mt-22'>
            <div className='flex-1'>
            </div>
            <div className='flex-1 flex md:justify-end'>
                <div className='flex flex-col gap-10 md:gap-16 w-full md:w-auto'>
                    <div className='grid grid-cols-2 sm:grid-cols-3 gap-8 md:flex md:gap-0'>
                        <div className='md:w-[200px] flex flex-col gap-3'>
                            <h3 className='font-bold'>Our Company</h3>
                            <p>Pricing</p>
                            <p>Docs</p>
                        </div>
                        <div className='md:w-[200px] flex flex-col gap-3'>
                            <h3 className='font-bold'>Contact</h3>
                            <p>FAQs</p>
                            <p>Email</p>
                            <p>Social Media</p>
                        </div>
                        <div className='md:w-[200px] flex flex-col gap-3'>
                            <h3 className='font-bold'>API</h3>
                            <p>Join Waitlist</p>
                        </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-3 justify-end pr-8'>
                        <p className='text-sm'>2026 logocat &copy; All rights reserved.</p>
                        <div className='flex items-center gap-2'>
                            <a href="mailto:malay77patra@gmail.com" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-all duration-300'>
                                <Image src="/email.svg" alt="Email" width={100} height={100} className='size-6' />
                            </a>
                            <a href="https://github.com/qubydev" target="_blank" rel="noopener noreferrer" className='hover:scale-110 transition-all duration-300'>
                                <Image src="/github.svg" alt="GitHub" width={100} height={100} className='size-6' />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <Image
                src="/flowers.png"
                height={376}
                width={540}
                alt="Flowers"
                className='w-80 h-auto absolute bottom-0 left-0 -z-10'
            />
        </footer>
    )
}