import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const uploadOnCloudinary = async (
  localFilePath: string
): Promise<UploadApiResponse | null> => {
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const response: UploadApiResponse = await cloudinary.uploader.upload(
      localFilePath,
      {
        resource_type: "auto",
      }
    );

    fs.unlinkSync(localFilePath); // delete the file from public/temp which is stored for temp purpose

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file if the upload operation fails
    return null;
  }
};

const deleteImageByPublicId = async (publicId: string): Promise<void> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log("Old Image deleted successfully from Cloudinary.");
    } else {
      console.log("Failed to delete old image:", result);
    }
  } catch (error) {
    console.error("Error while deleting old image:", error);
  }
};

export { uploadOnCloudinary, deleteImageByPublicId };
