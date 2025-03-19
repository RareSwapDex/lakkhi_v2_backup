import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useCampaign, donateToCampaign } from '@/utils/anchor-client';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Image,
  Progress,
  VStack,
  HStack,
  Badge,
  useDisclosure,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { CalendarIcon, TimeIcon } from '@chakra-ui/icons';
import Head from 'next/head';
import CardPaymentModal from '@/components/CardPaymentModal';

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  const { campaign, loading, error } = useCampaign(id as string);
  const [donationAmount, setDonationAmount] = useState(10);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isCardPaymentOpen,
    onOpen: onCardPaymentOpen,
    onClose: onCardPaymentClose,
  } = useDisclosure();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <Layout>
        <Center h="500px">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert status="error" mt={8}>
          <AlertIcon />
          Error loading campaign: {error.message}
        </Alert>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <Alert status="warning" mt={8}>
          <AlertIcon />
          Campaign not found
        </Alert>
      </Layout>
    );
  }

  const fundingProgress = campaign.currentAmount && campaign.targetAmount
    ? (campaign.currentAmount.toNumber() / campaign.targetAmount.toNumber()) * 100
    : 0;
    
  const daysLeft = campaign.endDate
    ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isDonationDisabled = !wallet.connected || campaign.fundsReleased || !campaign.isActive;

  const handleDonate = async () => {
    if (!wallet.connected) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert to lamports or the smallest denomination
      const amountInSmallestUnit = donationAmount * 1_000_000_000; // Convert to lamports or equivalent
      
      await donateToCampaign(
        campaign.pubkey.toString(),
        amountInSmallestUnit
      );
      
      // Reload the page to show updated donation amount
      router.reload();
    } catch (error) {
      console.error('Error donating:', error);
      alert(`Error donating: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Layout>
      <Head>
        <title>{campaign.name} | Lakkhi Fundraising</title>
        <meta name="description" content={campaign.description} />
      </Head>

      <Box maxW="1200px" mx="auto" p={4}>
        <Box
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="lg"
          bg="white"
        >
          <Flex direction={{ base: 'column', md: 'row' }}>
            <Box width={{ base: '100%', md: '50%' }} position="relative">
              <Image
                src={campaign.imageUrl || 'https://via.placeholder.com/800x600?text=No+Image'}
                alt={campaign.name}
                w="100%"
                h="400px"
                objectFit="cover"
              />
              <Badge
                colorScheme={campaign.isActive ? 'green' : 'red'}
                position="absolute"
                top="4"
                right="4"
                fontSize="sm"
              >
                {campaign.isActive ? 'Active' : 'Ended'}
              </Badge>
            </Box>

            <Box p={6} width={{ base: '100%', md: '50%' }}>
              <Heading as="h1" size="xl" mb={4}>
                {campaign.name}
              </Heading>

              <HStack spacing={4} mb={4}>
                <Badge colorScheme="purple">{campaign.category}</Badge>
                <Flex align="center">
                  <CalendarIcon mr={1} />
                  <Text fontSize="sm">
                    {daysLeft} days left
                  </Text>
                </Flex>
              </HStack>

              <VStack align="stretch" spacing={4} mb={6}>
                <Box>
                  <Flex justify="space-between" mb={1}>
                    <Text fontWeight="bold">
                      ${campaign.currentAmount.toNumber().toLocaleString()} raised
                    </Text>
                    <Text>
                      of ${campaign.targetAmount.toNumber().toLocaleString()} goal
                    </Text>
                  </Flex>
                  <Progress
                    value={fundingProgress}
                    size="md"
                    colorScheme="green"
                    borderRadius="full"
                  />
                </Box>

                <Flex justify="space-between">
                  <Text fontSize="sm">
                    {campaign.donorsCount.toNumber()} donors
                  </Text>
                  <Text fontSize="sm">
                    {Math.round(fundingProgress)}% funded
                  </Text>
                </Flex>
              </VStack>

              <Flex gap={4} mb={6}>
                <Button
                  colorScheme="blue"
                  size="lg"
                  width="full"
                  isDisabled={isDonationDisabled}
                  onClick={onOpen}
                >
                  Donate with Crypto
                </Button>
                <Button
                  colorScheme="green"
                  size="lg"
                  width="full"
                  onClick={onCardPaymentOpen}
                >
                  Donate with Card
                </Button>
              </Flex>

              {!wallet.connected && (
                <Alert status="info" borderRadius="md" mb={4}>
                  <AlertIcon />
                  Connect your wallet to donate with cryptocurrency
                </Alert>
              )}
              
              {campaign.fundsReleased && (
                <Alert status="info" borderRadius="md" mb={4}>
                  <AlertIcon />
                  Funds have been released to the campaign creator
                </Alert>
              )}
            </Box>
          </Flex>

          <Box p={6}>
            <Heading as="h2" size="lg" mb={4}>
              About this campaign
            </Heading>
            <Text whiteSpace="pre-wrap">{campaign.description}</Text>
          </Box>
        </Box>
      </Box>
      
      {/* Donation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Donate to {campaign.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>How much would you like to donate?</Text>
              <NumberInput
                min={1}
                max={1000}
                value={donationAmount}
                onChange={(valueString) => setDonationAmount(parseFloat(valueString))}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleDonate}
              isLoading={isSubmitting}
              loadingText="Processing"
            >
              Confirm Donation
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Card Payment Modal */}
      <CardPaymentModal
        isOpen={isCardPaymentOpen}
        onClose={onCardPaymentClose}
        campaign={campaign}
      />
    </Layout>
  );
} 