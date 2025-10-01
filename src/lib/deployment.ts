import { toast } from "sonner";
export const deploymentService = {
  async deployToCloudflare(): Promise<{ success: boolean; message: string }> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      const response = await fetch('/api/deploy/cloudflare', {
        method: 'POST',
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Cloudflare deployment failed.');
      }
      return { success: true, message: result.data.message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Cloudflare deployment error:', message);
      return { success: false, message };
    }
  },
  async generateDockerfile(): Promise<{ success: boolean; message: string }> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch('/api/deploy/dockerfile', {
        method: 'POST',
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Dockerfile generation failed.');
      }
      return { success: true, message: result.data.message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Dockerfile generation error:', message);
      return { success: false, message };
    }
  },
};