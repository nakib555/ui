/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { useAppLogic } from '../../hooks/useAppLogic';
import { Toast } from '../UI/Toast';
import { AppSkeleton } from '../UI/AppSkeleton';
import {
  DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS
} from './constants';
import { VersionMismatchOverlay } from '../UI/VersionMismatchOverlay';

// Lazy Load Major UI Blocks to optimize initial render and bundle splitting
const Sidebar = React.lazy(() => import('../Sidebar/Sidebar').then(module => ({ default: module.Sidebar })));
const ChatHeader = React.lazy(() => import('../Chat/ChatHeader').then(module => ({ default: module.ChatHeader })));
const ChatArea = React.lazy(() => import('../Chat/ChatArea').then(module => ({ default: module.ChatArea })));
const SourcesSidebar = React.lazy(() => import('../AI/SourcesSidebar').then(module => ({ default: module.SourcesSidebar })));
const ArtifactSidebar = React.lazy(() => import('../Sidebar/ArtifactSidebar').then(module => ({ default: module.ArtifactSidebar })));
const ThinkingSidebar = React.lazy(() => import('../Sidebar/ThinkingSidebar').then(module => ({ default: module.ThinkingSidebar })));
const AppModals = React.lazy(() => import('./AppModals').then(module => ({ default: module.AppModals })));
const TestRunner = React.lazy(() => import('../Testing').then(module => ({ default: module.TestRunner })));

export const App = () => {
  const logic = useAppLogic();

  const currentChat = logic.currentChatId
    ? logic.chatHistory.find(c => c.id === logic.currentChatId)
    : null;
  const chatTitle = currentChat ? currentChat.title : null;
  
  // Find the currently active message for thinking sidebar logic if needed
  // Use optional chaining for messages array as it might be undefined during initial load
  const activeMessage = currentChat?.messages?.length ? currentChat.messages[currentChat.messages.length - 1] : null;

  return (
    <div 
        ref={logic.appContainerRef} 
        className={`flex h-full bg-transparent overflow-hidden transition-[height] duration-200 ease-out ${logic.isAnyResizing ? 'pointer-events-none' : ''}`}
        // Apply visual viewport height constraint on mobile to ensure the entire app layout resizes 
        // correctly when the virtual keyboard opens, preventing the UI from being pushed up or scrolling.
        style={{ 
            height: !logic.isDesktop && logic.visualViewportHeight ? `${logic.visualViewportHeight}px` : '100dvh' 
        }}
    >
      {logic.versionMismatch && <VersionMismatchOverlay />}
      
      {/* Global Suspense Boundary with Shimmering Skeleton Loader */}
      <Suspense fallback={<AppSkeleton />}>
        <Sidebar
          key={logic.isDesktop ? 'desktop' : 'mobile'}
          isDesktop={logic.isDesktop}
          isOpen={logic.isSidebarOpen} 
          setIsOpen={logic.setIsSidebarOpen}
          isCollapsed={logic.isSidebarCollapsed}
          setIsCollapsed={logic.handleSetSidebarCollapsed}
          width={logic.sidebarWidth}
          setWidth={logic.handleSetSidebarWidth}
          isResizing={logic.isResizing}
          setIsResizing={logic.setIsResizing}
          history={logic.chatHistory}
          isHistoryLoading={logic.isHistoryLoading}
          currentChatId={logic.currentChatId}
          onNewChat={logic.startNewChat}
          isNewChatDisabled={logic.isNewChatDisabled}
          onLoadChat={logic.loadChat}
          onDeleteChat={logic.handleDeleteChatRequest}
          onUpdateChatTitle={logic.updateChatTitle}
          onSettingsClick={() => logic.setIsSettingsOpen(true)}
        />

        <main 
            className="relative z-10 flex-1 flex flex-col chat-background min-w-0 h-full"
        >
          {/* Mobile Sidebar Toggle - Only visible on mobile when sidebar is closed */}
          {!logic.isDesktop && !logic.isSidebarOpen && (
            <button
              onClick={() => logic.setIsSidebarOpen(true)}
              className="absolute top-3 left-4 z-50 p-2 rounded-lg bg-white/80 dark:bg-black/50 backdrop-blur-md border border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-sm"
              aria-label="Open sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}

          <div className="flex-1 flex flex-col w-full min-h-0">
             <ChatHeader 
                isDesktop={logic.isDesktop}
                handleToggleSidebar={logic.handleToggleSidebar}
                isSidebarOpen={logic.isSidebarOpen}
                isSidebarCollapsed={logic.isSidebarCollapsed}
                onImportChat={logic.handleImportChat}
                onExportChat={logic.handleExportChat}
                onShareChat={() => logic.handleShareChat()}
                isChatActive={logic.isChatActive}
                chatTitle={chatTitle}
             />
             <ChatArea 
                messageListRef={logic.messageListRef}
                messages={logic.messages}
                isLoading={logic.isLoading}
                isAppLoading={logic.modelsLoading || logic.settingsLoading}
                sendMessage={logic.sendMessage}
                onCancel={logic.cancelGeneration}
                ttsVoice={logic.ttsVoice}
                ttsModel={logic.ttsModel}
                setTtsVoice={logic.setTtsVoice}
                currentChatId={logic.currentChatId}
                activeModel={logic.activeModel} 
                onShowSources={logic.handleShowSources}
                approveExecution={logic.approveExecution}
                denyExecution={logic.denyExecution}
                onRegenerate={logic.regenerateResponse}
                onSetActiveResponseIndex={logic.setActiveResponseIndex}
                isAgentMode={logic.isAgentMode}
                setIsAgentMode={logic.setIsAgentMode}
                backendStatus={logic.backendStatus}
                backendError={logic.backendError}
                onRetryConnection={logic.retryConnection}
                hasApiKey={!!logic.apiKey}
                onEditMessage={logic.editMessage}
                onNavigateBranch={logic.navigateBranch}
             />
          </div>
        </main>

        <SourcesSidebar
          isOpen={logic.isSourcesSidebarOpen}
          onClose={logic.handleCloseSourcesSidebar}
          sources={logic.sourcesForSidebar}
          width={logic.sourcesSidebarWidth}
          setWidth={logic.handleSetSourcesSidebarWidth}
          isResizing={logic.isSourcesResizing}
          setIsResizing={logic.setIsSourcesResizing}
        />

        <ThinkingSidebar
            isOpen={false} // Placeholder: Logic to toggle this sidebar not fully exposed in prompt, defaulting to false/hidden or controlled by logic if implemented
            onClose={() => {}} 
            message={activeMessage}
            sendMessage={logic.sendMessage}
            width={logic.thinkingSidebarWidth}
            setWidth={logic.handleSetThinkingSidebarWidth}
            isResizing={logic.isThinkingResizing}
            setIsResizing={logic.setIsThinkingResizing}
            onRegenerate={logic.regenerateResponse}
        />

        <ArtifactSidebar
            isOpen={logic.isArtifactOpen}
            onClose={() => logic.setIsArtifactOpen(false)}
            content={logic.artifactContent}
            language={logic.artifactLanguage}
            width={logic.artifactWidth}
            setWidth={logic.setArtifactWidth}
            isResizing={logic.isArtifactResizing}
            setIsResizing={logic.setIsArtifactResizing}
        />

        <AppModals
          isDesktop={logic.isDesktop}
          isSettingsOpen={logic.isSettingsOpen}
          setIsSettingsOpen={logic.setIsSettingsOpen}
          isMemoryModalOpen={logic.isMemoryModalOpen}
          setIsMemoryModalOpen={logic.setIsMemoryModalOpen}
          isImportModalOpen={logic.isImportModalOpen}
          setIsImportModalOpen={logic.setIsImportModalOpen}
          handleFileUploadForImport={logic.handleFileUploadForImport}
          onRunTests={() => logic.setIsTestMode(true)}
          onDownloadLogs={logic.handleDownloadLogs}
          onShowDataStructure={logic.handleShowDataStructure}
          availableModels={logic.availableModels}
          availableImageModels={logic.availableImageModels}
          availableVideoModels={logic.availableVideoModels}
          availableTtsModels={logic.availableTtsModels}
          activeModel={logic.activeModel}
          onModelChange={logic.onModelChange}
          modelsLoading={logic.modelsLoading || logic.settingsLoading}
          clearAllChats={logic.handleRequestClearAll}
          apiKey={logic.apiKey}
          onSaveApiKey={logic.onSaveApiKey}
          suggestionApiKey={logic.suggestionApiKey}
          onSaveSuggestionApiKey={logic.onSaveSuggestionApiKey}
          aboutUser={logic.aboutUser}
          setAboutUser={logic.setAboutUser}
          aboutResponse={logic.aboutResponse}
          setAboutResponse={logic.setAboutResponse}
          temperature={logic.temperature}
          setTemperature={logic.setTemperature}
          maxTokens={logic.maxTokens}
          setMaxTokens={logic.setMaxTokens}
          imageModel={logic.imageModel}
          onImageModelChange={logic.onImageModelChange}
          videoModel={logic.videoModel}
          onVideoModelChange={logic.onVideoModelChange}
          ttsModel={logic.ttsModel}
          onTtsModelChange={logic.onTtsModelChange}
          defaultTemperature={DEFAULT_TEMPERATURE}
          defaultMaxTokens={DEFAULT_MAX_TOKENS}
          isMemoryEnabled={logic.isMemoryEnabled}
          setIsMemoryEnabled={logic.setIsMemoryEnabled}
          onManageMemory={() => logic.setIsMemoryModalOpen(true)}
          memoryContent={logic.memoryContent}
          memoryFiles={logic.memoryFiles}
          clearMemory={logic.clearMemory}
          updateBackendMemory={logic.updateBackendMemory}
          updateMemoryFiles={logic.updateMemoryFiles}
          isConfirmationOpen={logic.isConfirmationOpen}
          memorySuggestions={logic.memorySuggestions}
          confirmMemoryUpdate={logic.confirmMemoryUpdate}
          cancelMemoryUpdate={logic.cancelMemoryUpdate}
          ttsVoice={logic.ttsVoice}
          setTtsVoice={logic.setTtsVoice}
          confirmation={logic.confirmation}
          onConfirm={logic.handleConfirm}
          onCancel={logic.handleCancel}
          theme={logic.theme}
          setTheme={logic.setTheme}
          serverUrl={logic.serverUrl}
          onSaveServerUrl={logic.onSaveServerUrl}
          provider={logic.provider}
          openRouterApiKey={logic.openRouterApiKey}
          onProviderChange={logic.onProviderChange}
        />

        {logic.isTestMode && (
            <TestRunner 
                isOpen={logic.isTestMode}
                onClose={() => logic.setIsTestMode(false)}
                runTests={logic.runDiagnosticTests}
            />
        )}
      </Suspense>

      <Toast 
        message={logic.toast?.message || null} 
        type={logic.toast?.type} 
        onClose={logic.closeToast} 
      />
    </div>
  );
};