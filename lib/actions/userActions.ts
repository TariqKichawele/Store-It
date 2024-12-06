'use server'

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { avatarPlaceholderUrl } from "@/constants";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const getUserByEmail = async (email: string) => {
    const { database } = await createAdminClient();

    const result = await database.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal('email', [email] )]
    );

    return result.total > 0 ? result.documents[0] : null; 
};

const handleError = (error: unknown, message: string) => {
    console.log(error, message);
    throw error;
}

export const sendEmailOTP = async ({ email }: { email: string }) => {
    const { account } = await createAdminClient();

    try {
        const session = await account.createEmailToken(ID.unique(), email);

        return session.userId;
    } catch (error) {
        handleError(error, 'Failed to send email OTP');
    }
}

export const createAccount = async ({ email, fullName }: { email: string, fullName: string }) => {
    const existingUser = await getUserByEmail(email);

    const accountId = await sendEmailOTP({ email });
    if(!accountId) throw new Error('Failed to send email OTP');

    if(!existingUser) {
        const { database } = await createAdminClient();

        await database.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            ID.unique(),
            {
                email,
                fullName,
                accountId,
                avatar: avatarPlaceholderUrl
            }
        )
    };

    return parseStringify({ accountId });
};

export const verifySecret = async ({ accountId, password }: { accountId: string, password: string }) => {
    try {
        const { account } = await createAdminClient();

        const session = await account.createSession(accountId, password);

        (await cookies()).set("appwrite-session", session.secret, {
            secure: true,
            sameSite: 'strict',
            path: '/',
            httpOnly: true
        });

        return parseStringify({ sessionId: session.$id });
    } catch (error) {
        handleError(error, 'Failed to verify secret');
    }
}

export const getCurrentUser = async () => {
    try {
        const { database, account } = await createSessionClient();

        const result = await account.get();

        const user = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [Query.equal("accountId", [result.$id] )]
        );

        if(user.total <= 0) return null;

        return parseStringify(user.documents[0]);
    } catch (error) {
        console.log(error);
    }
}

export const signOutUser = async () => {
    const { account } = await createAdminClient();

    try {
        await account.deleteSession('current');
        (await cookies()).delete('appwrite-session');
    } catch (error) {
        handleError(error, 'Failed to sign out user');
    } finally {
        redirect('/sign-in');
    }
}

export const signInUser = async ({ email }: { email: string }) => {
    try {
        const existingUser = await getUserByEmail(email);

        if(existingUser) {
            await sendEmailOTP({ email });
            return parseStringify({ accountId: existingUser.accountId });
        }

        return parseStringify({ accountId: null, error: 'User not found' });
    } catch (error) {
        handleError(error, 'Failed to sign in user');
    }
};