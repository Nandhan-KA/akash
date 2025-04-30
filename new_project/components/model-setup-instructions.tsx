"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ModelSetupInstructions() {
  const [isOpen, setIsOpen] = useState(true)

  if (!isOpen) return null

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="flex items-center text-yellow-700 dark:text-yellow-300">
          <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
          Model Setup Required
        </CardTitle>
        <CardDescription className="text-yellow-600 dark:text-yellow-400">
          You need to download the required model files for real-time detection to work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="default" className="bg-white dark:bg-gray-800">
          <AlertTitle>Face-API.js Models</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              For emotion recognition to work, download these model files and place them in the{" "}
              <code>/public/models</code> directory:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>tiny_face_detector_model-shard1</li>
              <li>tiny_face_detector_model-weights_manifest.json</li>
              <li>face_expression_model-shard1</li>
              <li>face_expression_model-weights_manifest.json</li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                window.open("https://github.com/justadudewhohacks/face-api.js/tree/master/weights", "_blank")
              }
            >
              <Download className="h-4 w-4 mr-1" />
              Download Models
            </Button>
          </AlertDescription>
        </Alert>

        <Alert variant="default" className="bg-white dark:bg-gray-800">
          <AlertTitle>TensorFlow.js Models</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              The phone detection uses TensorFlow.js with the COCO-SSD model, which will be automatically downloaded
              when you start the detection.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Note: The first time you run phone detection, it may take a moment to download the model (approximately
              5-10MB).
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            <Check className="h-4 w-4 mr-1" />
            I've Set Up the Models
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
