'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage 
} from './ui/form'
import { Input } from './ui/input'
import { Button } from './ui/button'
import Image from 'next/image'
import Link from 'next/link'
import OtpModal from './OTPModal'
import { createAccount, signInUser } from '@/lib/actions/userActions'

type FormType = 'sign-up' | 'sign-in'

const authFormSchema = (formType: FormType) => {
    return z.object({
        email: z.string().email(),
        fullName: 
            formType === 'sign-up'
            ? z.string().min(2).max(50)
            : z.string().optional(),
    });
}

const AuthForm = ({ type }: { type: FormType }) => {
    const [ isLoading, setIsLoading ] = useState(false);
    const [ error, setError ] = useState('');
    const [ accountId, setAccountId ] = useState(null);

    const formSchema = authFormSchema(type);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            fullName: '',
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        setError('');

        try {
            const user = 
                type === 'sign-up' 
                ? await createAccount({ email: values.email, fullName: values.fullName || "" })
                : await signInUser({ email: values.email });

            setAccountId(user.accountId);
        } catch {
            setError('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };


  return (
    <>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='auth-form'>
                <h1 className='form-title'>
                    {type === 'sign-up' ? 'Sign Up' : 'Sign In'}
                </h1>
                {type === 'sign-up' && (
                    <FormField 
                        control={form.control}
                        name='fullName'
                        render={({ field }) => (
                            <FormItem>
                                <div className='shad-form-item'>
                                    <FormLabel className='shad-form-label'>Full Name</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field}
                                            placeholder='Enter your full name'
                                            className='shad-input'
                                        />
                                    </FormControl>
                                </div>
                            </FormItem>
                        )}
                    />
                )}

                <FormField 
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                        <FormItem>
                            <div className='shad-form-item'>
                                <FormLabel className='shad-form-label'>Email</FormLabel>

                                <FormControl>
                                     <Input 
                                        {...field}
                                        placeholder='Enter your email'
                                        className='shad-input'
                                    />
                                </FormControl>
                            </div>

                            <FormMessage className='shad-form-message' />
                        </FormItem>
                    )}
                />

                <Button
                    type='submit'
                    className='form-submit-button'
                    disabled={isLoading}
                >
                    {type === 'sign-up' ? 'Sign Up' : 'Sign In'}

                    {isLoading && (
                        <Image 
                            src={'/assets/icons/loader.svg'}
                            alt='loader'
                            width={24}
                            height={24}
                            className='ml-2 animate-spin'
                        />
                    )}
                </Button>

                {error && <p className='error-message'>*{error}</p>}

                <div className='body-2 flex justify-center'>
                    <p>
                        {type === 'sign-up' ? 'Already have an account? ' : 'Don\'t have an account? '}
                    </p>
                    <Link
                        href={type === 'sign-up' ? '/sign-in' : '/sign-up'}
                        className='ml-1 font-medium text-brand'
                    >
                        {" "}
                        {type === 'sign-up' ? 'Sign In' : 'Sign Up'}
                    </Link>
                </div>
            </form>
        </Form>

        {accountId && ( 
            <OtpModal email={form.getValues('email')} accountId={accountId}/> 
        )}
    
    </>
  )
}

export default AuthForm