import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Camera, X } from "lucide-react";

export const AdminProfileUpload = forwardRef(({ onUploadComplete }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  const { toast } = useToast();
  const { user, updateUserProfile } = useAuth();

  // Expose the openDialog function to parent components
  useImperativeHandle(ref, () => ({
    openDialog: () => setIsDialogOpen(true)
  }));

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.id) return;

    setUploading(true);
    try {
      // For now, we'll use a local preview. In production, you would upload to Cloudinary
      const mockUploadResult = {
        url: previewUrl,
        publicId: `admin_profile_${user.id}_${Date.now()}`
      };

      // Update user profile with the new image URL
      if (updateUserProfile) {
        await updateUserProfile({
          profilePhoto: mockUploadResult.url
        });
      }

      toast({
        title: "Success!",
        description: "Profile photo updated successfully",
      });

      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete(mockUploadResult.url);
      }

      // Close dialog and reset
      setIsDialogOpen(false);
      removeSelectedFile();

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Admin Profile Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Profile Photo */}
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="w-32 h-32">
              <AvatarImage 
                src={previewUrl || user?.profilePhoto} 
                alt={user?.name || 'Admin'} 
              />
              <AvatarFallback className="text-2xl">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>

            <div className="text-center">
              <h3 className="font-semibold text-gray-900">{user?.name || 'Admin User'}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Upload Area */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="space-y-3">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-blue-100"
                />
                <p className="text-sm font-medium text-gray-700">
                  {selectedFile?.name}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSelectedFile();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Camera className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-gray-600 mb-1">
                    Click to select profile photo
                  </p>
                  <p className="text-sm text-gray-500">
                    JPG, PNG, GIF up to 5MB
                  </p>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

AdminProfileUpload.displayName = 'AdminProfileUpload';
