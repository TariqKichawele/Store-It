'use client'

import { MAX_FILE_SIZE } from '@/constants'
import { useToast } from '@/hooks/use-toast'
import { usePathname } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone';
import { Button } from './ui/button'
import Image from 'next/image'
import { cn, convertFileToUrl, getFileType } from '@/lib/utils'
import Thumbnail from './Thumbnail'
import { uploadFile } from '@/lib/actions/fileActions'

interface Props {
    ownerId: string
    accountId: string
    className?: string
}

const FileUploader = ({ ownerId, accountId, className }: Props) => {
    const path = usePathname();
    const { toast } = useToast();
    const [ files, setFiles ] = useState<File[]>([]);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            setFiles(acceptedFiles);

            const uploadPromises = acceptedFiles.map(async(file) => {
                if(file.size > MAX_FILE_SIZE) {
                    setFiles((prevFiles) => 
                        prevFiles.filter((f) => f.name !== file.name)
                    )

                    return toast({
                        description: (
                            <p className="body-2 text-white">
                              <span className="font-semibold">{file.name}</span> is too large.
                              Max file size is 50MB.
                            </p>
                        ),
                        className: "error-toast",
                    })
                }

                return uploadFile({ file, ownerId, accountId, path }).then(
                    (uploadedFile) => {
                        if(uploadedFile) {
                            setFiles((prevFiles) => {
                                return prevFiles.filter((f) => f.name !== file.name)
                            })
                        }
                    }
                );
            });

            await Promise.all(uploadPromises);
        },
        [path, ownerId, accountId]
    )

    const { getRootProps, getInputProps } = useDropzone({ onDrop })

    const handleRemoveFile = (fileName: string, e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        e.stopPropagation();
        setFiles((prevFiles) => {
            return prevFiles.filter((f) => f.name !== fileName)
        })
    };

  return (
    <div {...getRootProps()} className='cursor-pointer'>
        <input {...getInputProps()} />
        <Button type='button' className={cn('uploader-button', className)}>
            <Image 
                src="/assets/icons/upload.svg"
                alt="Upload"
                width={24}
                height={24}
            />{" "}
            <p>Upload</p>
        </Button>
        {files.length > 0 && (
            <ul className='uploader-preview-list'>
                <h4 className='h4 text-light-100'>Uploading</h4>

                {files.map((file, index) => {
                    const { type, extension } = getFileType(file.name);

                    return (
                        <li key={`${file.name}-${index}`} className='uploader-preview-item'>
                            <div className='flex items-center gap-3'>
                                <Thumbnail 
                                    type={type}
                                    extension={extension}
                                    url={convertFileToUrl(file)}
                                />

                                <div className='preview-item-name'>
                                    {file.name}
                                    <Image 
                                        src="/assets/icons/file-loader.gif"
                                        alt="Upload"
                                        width={80}
                                        height={26}
                                    />
                                </div>
                            </div>

                            <Image 
                                src="/assets/icons/remove.svg"
                                alt="Remove"
                                width={24}
                                height={24}
                                onClick={(e) => handleRemoveFile(file.name, e)}
                            />
                        </li>
                    )
                })}
            </ul>
        )}
    </div>
  )
}

export default FileUploader