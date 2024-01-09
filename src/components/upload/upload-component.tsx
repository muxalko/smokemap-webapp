import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import "./style.css"; // Import the CSS file for styling

const UploadComponent = ({
  setCallbackHandler,
}: {
  setCallbackHandler: (files: File[]) => void;
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleDrop = (acceptedFiles: File[]) => {
    // Logic for handling the dropped files
    setUploadedFiles(acceptedFiles);
    setCallbackHandler(acceptedFiles);
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/png": [".png"],
      "image/jpg": [".jpg"],
      //   "text/html": [".html", ".htm"],
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
        <h3>Uploaded File:</h3>
        {uploadedFiles.length > 0 ? (
          <ul>
            {uploadedFiles.map((file: File, index: number) => (
              <li key={index}>
                <span>{file.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No file uploaded</p>
        )}
      </div>
    </div>
  );
};

export default UploadComponent;
