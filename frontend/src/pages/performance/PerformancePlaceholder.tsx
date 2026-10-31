import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { HardHat } from 'lucide-react';

const PerformancePlaceholder = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-8">
        <HardHat size={40} className="text-emerald-500" />
      </div>
      
      <h2 className="text-3xl font-bold text-brand-navy mb-4">Performance Module in Development</h2>
      
      <p className="text-gray-500 max-w-md mb-10 leading-relaxed">
        We're hard at work building the Performance module to provide you with the most advanced HR analytics tools. 
        This feature will be available in a future update.
      </p>
      
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="px-6"
        >
          Go Back
        </Button>
        <Button 
          onClick={() => navigate('/dashboard')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-8 shadow-lg shadow-emerald-500/20"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default PerformancePlaceholder;
