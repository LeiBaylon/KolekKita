import { useMemo } from "react";
import { getPasswordStrength, PASSWORD_REQUIREMENTS } from "@/utils/passwordValidation";
import { CheckCircle, XCircle } from "lucide-react";

/**
 * Password strength indicator component
 * Shows visual feedback on password strength and requirements
 */
export const PasswordStrengthIndicator = ({ password }) => {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  
  const requirements = useMemo(() => [
    {
      text: "At least 8 characters",
      met: password.length >= 8
    },
    {
      text: "One uppercase letter",
      met: /[A-Z]/.test(password)
    },
    {
      text: "One lowercase letter",
      met: /[a-z]/.test(password)
    },
    {
      text: "One number",
      met: /[0-9]/.test(password)
    },
    {
      text: "One special character",
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ], [password]);
  
  if (!password) return null;
  
  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Password strength:</span>
          <span className={`font-medium ${
            strength.color === 'green' ? 'text-green-600' :
            strength.color === 'orange' ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {strength.level.charAt(0).toUpperCase() + strength.level.slice(1)}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              strength.color === 'green' ? 'bg-green-500' :
              strength.color === 'orange' ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>
      
      {/* Requirements checklist */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600 font-medium">Requirements:</p>
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <XCircle className="h-3 w-3 text-gray-300" />
            )}
            <span className={req.met ? "text-green-600" : "text-gray-500"}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
