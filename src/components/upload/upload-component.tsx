import React, { useState } from "react";
import { useDropzone, FileRejection, FileWithPath } from "react-dropzone";
import "./style.css"; // Import the CSS file for styling

const UploadComponent = ({
  setCallbackHandler,
}: {
  setCallbackHandler: (files: FileWithPath[]) => void;
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPath[]>([]);
  const [rejectionMessages, setRejectionMessages] = useState<string[]>([]);

  const handleDrop = (acceptedFiles: FileWithPath[]) => {
    setRejectionMessages([]);
    setUploadedFiles(acceptedFiles);

    setCallbackHandler(acceptedFiles);
  };

  const handleRejected = (fileRejections: FileRejection[]) => {
    setRejectionMessages(
      fileRejections.flatMap(({ file, errors }) =>
        errors.map(({ message }) => `${file.name}: ${message}`)
      )
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: handleDrop,
    onDropRejected: handleRejected,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    // accept: "image/*, .pdf, .doc, .docx",
    multiple: true,
    maxFiles: 3,
    maxSize: 5000000,
  });

  return (
    <div className="upload-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the file here</p>
        ) : (
          <p>Drag and drop file here or click to browse</p>
        )}
      </div>

      <div className="file-list">
        <h3>Selected images:</h3>
        {uploadedFiles.length > 0 ? (
          <ul>
            {uploadedFiles.map((file: FileWithPath, index: number) => (
              <li key={index}>
                <span>{file.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No images selected (optional)</p>
        )}
        {rejectionMessages.length > 0 && (
          <ul aria-live="polite" className="text-red-700">
            {rejectionMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UploadComponent;
