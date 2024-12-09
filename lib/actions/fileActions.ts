'use server';

import { createAdminClient, createSessionClient } from "../appwrite";
import { InputFile } from "node-appwrite/file";
import { appwriteConfig } from "../appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { constructFileUrl, getFileType, parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./userActions";

const handleError = (error: unknown, message: string) => {
    console.log(error, message);
    throw error;
};

export const uploadFile = async ({
    file,
    ownerId,
    accountId,
    path
} : UploadFileProps) => {
    const { storage, database } = await createAdminClient();

    try {
        const inputFile = InputFile.fromBuffer(file, file.name);

        const bucketFile = await storage.createFile(
            appwriteConfig.bucketId,
            ID.unique(),
            inputFile
        );

        const fileDocument = {
            type: getFileType(bucketFile.name).type,
            name: bucketFile.name,
            url: constructFileUrl(bucketFile.$id),
            extension: getFileType(bucketFile.name).extension,
            size: bucketFile.sizeOriginal,
            owner: ownerId,
            accountId,
            users: [],
            bucketFileId: bucketFile.$id,
        };

        const newFile = await database.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filesCollectionId,
            ID.unique(),
            fileDocument
        ).catch(async (error: unknown) => {
            await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
            handleError(error, 'Failed to create file');
        });

        revalidatePath(path);
        return parseStringify(newFile);
    } catch (error) {
        handleError(error, 'Failed to upload file');
    }
};

const createQueries = (
    currentUser: Models.Document,
    types: string[],
    searchText: string,
    sort: string,
    limit?: number
) => {
    const queries = [
        Query.or([
            Query.equal("owner", [currentUser.$id]),
            Query.contains("users", [currentUser.email])
        ])
    ];

    if(types.length > 0) queries.push(Query.equal("type", types));
    if(searchText) queries.push(Query.contains("name", searchText));
    if(limit) queries.push(Query.limit(limit));

    if(sort) {
        const [ sortBy, orderBy ] = sort.split('-');

        queries.push(
            orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy)
        )
    };

    return queries;
}

export const getFiles = async ({
    types = [],
    searchText = "",
    sort = "$createdAt-desc",
    limit
} : GetFilesProps) => {
    const { database } = await createAdminClient();

    try {
        const currentUser = await getCurrentUser();

        if(!currentUser) throw new Error('User not found');

        const queries = createQueries(currentUser, types, searchText, sort, limit);

        const files = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.filesCollectionId,
            queries
        );

        return parseStringify(files);
    } catch (error) {
        handleError(error, 'Failed to get files');
    }
};

export const renameFile = async ({
    fileId,
    name,
    extension,
    path
} : RenameFileProps) => {
    const { database } = await createAdminClient();

    try {
        const newName = `${name}.${extension}`;
        const updatedFile = await database.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filesCollectionId,
            fileId,
            { name: newName }
        );

        revalidatePath(path);

        return parseStringify(updatedFile);
    } catch (error) {
        handleError(error, 'Failed to rename file');
    }
};

export const deleteFile = async ({
    fileId,
    path,
    bucketFileId    
} : DeleteFileProps) => {
    const { database, storage } = await createAdminClient();

    try {
        const deletedFile = await database.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filesCollectionId,
            fileId
        );

        if(deletedFile) {
            await storage.deleteFile(appwriteConfig.bucketId, bucketFileId);
        };

        revalidatePath(path);
        return parseStringify({ status: 'success' });
    } catch (error) {
        handleError(error, 'Failed to delete file');
    }
}

export const updateFileUsers = async ({
    fileId,
    emails,
    path
} : UpdateFileUsersProps) => {
    const { database } = await createAdminClient();

    try {
        const updatedFile = await database.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.filesCollectionId,
            fileId,
            { users: emails }
        );

        revalidatePath(path);

        return parseStringify(updatedFile);
    } catch (error) {
        handleError(error, 'Failed to update file users');
    }
}

export async function getTotalSpaceUsed() {
    try {
        const { database } = await createSessionClient();

        const currentUser = await getCurrentUser();
        if(!currentUser) throw new Error('User not found');
    
        const files = await database.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.filesCollectionId,
            [Query.equal("owner", [currentUser.$id])]
        );

        const totalSpace = {
            image: { size: 0, latestDate: "" },
            document: { size: 0, latestDate: "" },
            video: { size: 0, latestDate: "" },
            audio: { size: 0, latestDate: "" },
            other: { size: 0, latestDate: "" },
            used: 0,
            all: 2 * 1024 * 1024 * 1024
        };

        files.documents.forEach((file) => {
            const fileType = file.type as FileType;

            totalSpace[fileType].size += file.size;
            totalSpace.used += file.size;

            if(
                !totalSpace[fileType].latestDate || 
                new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
            ) {
                totalSpace[fileType].latestDate = file.$updatedAt;
            }
        });

        return parseStringify(totalSpace);
    } catch (error) {
        handleError(error, 'Failed to get total space used');
    }
}

