import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Sparkles, 
  X, 
  Loader2, 
  Check, 
  Volume2, 
  AlertCircle, 
  FileText, 
  RotateCcw,
  Play,
  Pause
} from 'lucide-react';
import { useHomeCareStore } from '../store';

interface AudioDictationModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName?: string;
  onTranscriptionComplete: (transcription: string) => void;
}

export default function AudioDictationModal({
  isOpen,
  onClose,
  leadName,
  onTranscriptionComplete
}: AudioDictationModalProps) {
  const { transcribeAudioAi } = useHomeCareStore();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setTranscribedText('');
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta captura de áudio via microfone.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks in stream
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert Blob to Base64
        setIsProcessing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64String = reader.result as string;
            const text = await transcribeAudioAi(base64String, mimeType);
            setTranscribedText(text);
            setIsProcessing(false);
          };
        } catch (err: any) {
          console.error(err);
          setErrorMsg("Erro ao processar o áudio. Tente novamente.");
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(200); // collect 200ms chunks
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Microphone access error:", err);
      setErrorMsg("Acesso ao microfone negado ou indisponível. Permita o uso do microfone no navegador e tente novamente.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleReset = () => {
    if (isRecording) {
      stopRecording();
    }
    setIsRecording(false);
    setIsProcessing(false);
    setRecordingTime(0);
    setTranscribedText('');
    setAudioUrl(null);
    setErrorMsg(null);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleApply = () => {
    if (transcribedText.trim()) {
      onTranscriptionComplete(transcribedText);
      onClose();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 border border-green-400/30 rounded-xl text-green-400">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Ditado de Voz & Transcrição por IA</h3>
              <p className="text-slate-300 text-xs mt-0.5">
                {leadName ? `Paciente/Oportunidade: ${leadName}` : 'Dite notas de evolução clínica ou comercial'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Recording Canvas / Mic Control */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {isRecording ? (
              <div className="space-y-4">
                {/* Wave Animation */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 bg-red-500/10 rounded-full animate-ping" />
                  <div className="absolute w-20 h-20 bg-red-500/20 rounded-full animate-pulse" />
                  <button
                    onClick={stopRecording}
                    className="relative z-10 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-200 transition-all transform active:scale-95"
                    title="Parar Gravação"
                  >
                    <Square className="w-6 h-6 fill-white" />
                  </button>
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    <span>Gravando Ditado...</span>
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-slate-800 mt-2">
                    {formatTime(recordingTime)}
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="py-6 space-y-3">
                <div className="p-3 bg-green-50 text-green-600 rounded-full inline-block animate-bounce">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Transcrevendo Áudio com Gemini IA...</h4>
                  <p className="text-xs text-slate-500 mt-1">Formatando e pontuando o relato médico do ditado.</p>
                </div>
                <div className="w-48 bg-slate-200 h-1.5 rounded-full mx-auto overflow-hidden">
                  <div className="bg-green-600 h-full w-full animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <div className="flex justify-center gap-4">
                  {/* Real Mic button */}
                  <button
                    onClick={startRecording}
                    className="w-16 h-16 bg-gradient-to-r from-green-600 to-indigo-600 hover:from-green-700 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-200 transition-all transform hover:scale-105 active:scale-95"
                    title="Iniciar Gravação de Áudio"
                  >
                    <Mic className="w-7 h-7" />
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-700">Clique para iniciar ditado de voz</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Fale claramente sobre a evolução, sinais vitais ou ocorrências do paciente.</p>
                </div>
              </div>
            )}
          </div>

          {/* Audio Player if recorded */}
          {audioUrl && !isRecording && !isProcessing && (
            <div className="bg-green-50/50 border border-green-100 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayAudio}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="hidden"
                />
                <span className="text-xs font-semibold text-green-900">Áudio gravado ({formatTime(recordingTime)})</span>
              </div>

              <button
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Gravar Novamente</span>
              </button>
            </div>
          )}

          {/* Transcribed Result Textarea */}
          {transcribedText && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span>Texto Transcrito (Editável):</span>
                </label>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Transcrição Concluída
                </span>
              </div>

              <textarea
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-medium focus:bg-white focus:ring-2 focus:ring-green-600 outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleApply}
            disabled={!transcribedText.trim() || isRecording || isProcessing}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Inserir Nota no CRM</span>
          </button>
        </div>
      </div>
    </div>
  );
}
